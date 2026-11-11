# Design

## Context

- **Admin router:** `apps/api/src/router/admin.ts` uses only `adminProcedure`, which reads the role fresh on every call. Today it serves `whoAmI`, club CRUD and lifecycle, and per-club trainers and invitations.
- **Admin action log (`AdminActionLog`):**
  - Every admin write inserts a row in the same transaction (`recordAdminAction`).
  - Club actions target the club (`targetType = 'club'`, `targetId = clubId`). Trainer and invitation actions target the assignment or invitation and store `metadata.clubId`.
  - `metadata` is validated by `adminActionMetadataSchema`: `clubId`, `changedFields`, cancelled counts, `closedExpiredInvitationId`.
  - The table has RLS enabled and forced, no client policies, and all privileges revoked from `anon` and `authenticated`. The API's connection bypasses RLS.
- **Who acted:** the log stores `actorUserAccountId`. `UserAccount` has no email; emails live in Supabase Auth, and `supabaseUserId` links the two.
- **Service-role access:** it exists only in `lib/supabaseAdmin.ts`, as narrow ports. `DeletionExternals.getConfirmedEmail` already calls `auth.admin.getUserById`.
- **Invited emails:** `listClubTrainers` already derives a trainer's "Invited as" email from the latest `ACCEPTED` invitation for that `(club, userAccount)`. A redacted invitation gives null.
- **Shared dev environment:** integration tests run against the shared dev database and Redis (Upstash free tier), so absolute counts aren't stable between runs.

## Goals / Non-Goals

**Goals:**
- Each new read is one admin procedure with explicit `select` and cursor pagination, and with no raw SQL.
- The acting-admin email lookup is isolated, cached and fail-soft: the log loads even when Supabase Auth is down.

**Non-Goals:**
- No change to how admin actions are written, to the metadata schema, or to RLS.
- No new indexes or migrations. If the action log's club filter needs an index later, that's a separate reviewed migration.

## Decisions

### D1. Procedures

All four live on the `admin` router; the service functions go in a new `services/adminInsights.ts`.

| Procedure | Input | Output |
|---|---|---|
| `getOverview` | none | `adminOverviewOutput` |
| `listTrainers` | `listAdminTrainersInput`: `paginationInput` + `access: 'ACTIVE' \| 'CLUB_DEACTIVATED' \| 'REVOKED' \| 'ALL'` (default `ALL`) + `clubQuery?` (2–100, trimmed) | `paginatedOutput(adminTrainerDirectoryEntryOutput)` |
| `listActions` | `listAdminActionsInput`: `paginationInput` + `action?: adminActionEnum` + `clubId?: cuid` | `paginatedOutput(adminActionEntryOutput)` |
| `listClubs` (changed) | `listAdminClubsInput` + `query?` (2–100, trimmed) + `withoutActiveTrainer?: boolean` | unchanged |

- **`getOverview`:** six `count()` queries in one array-form `prisma.$transaction([...], { isolationLevel: 'RepeatableRead' })`. In PostgreSQL, every statement of a `REPEATABLE READ` transaction reads the snapshot taken at its first statement, so all six counts come from one consistent snapshot. Concurrent writes are either fully counted or not at all, and active plus deactivated clubs always add up to that snapshot's total. Separate parallel queries (`Promise.all`) were rejected: each would take its own snapshot. `generatedAt` is taken just before the transaction starts. The transaction is read-only, holds no locks, and works through the Supabase pooler, as the existing admin transactions do. The six counts:
  - clubs with `deactivatedAt` null, and not null
  - active clubs with no active trainer, using the shared `clubsWithoutActiveTrainerWhere` (`deactivatedAt: null, trainers: { none: { revokedAt: null } }`), the same filter `listClubs({ withoutActiveTrainer: true })` uses, so the count and its linked list agree
  - `ClubTrainer` with `revokedAt` null and `club.deactivatedAt` null, the same `ACTIVE` access rule the directory uses
  - invitations `PENDING` with `expiresAt > now`
  - the same with `expiresAt <= now + 48h`

  The "pending" rule is the same one the per-club invitation list uses to derive its `PENDING` and `EXPIRED` states, so the overview and the club pages never disagree. Output: `{ activeClubs, deactivatedClubs, activeClubsWithoutTrainer, activeTrainers, pendingTrainerInvitations, expiringTrainerInvitations, generatedAt }`. Recent actions come from `listActions({ take: 5 })` on the page, not from the overview, so there's one shape and one cache key.
- **`listTrainers`:**
  - Selects `ClubTrainer` with `club: { select: { id, slug, name, deactivatedAt } }`, ordered by `createdAt desc, id desc`. `clubQuery` becomes `club: { name: { contains, mode: 'insensitive' } }`.
  - **Access state (ADR-017):** derived in one place, `trainerAccess(revokedAt, club.deactivatedAt)`. A revoked assignment is `REVOKED`, even at a deactivated club. A non-revoked one is `CLUB_DEACTIVATED` when the club is deactivated, and `ACTIVE` otherwise. The filter uses the matching `where` for each state:
    - `ACTIVE`: `revokedAt: null, club: { deactivatedAt: null }`
    - `CLUB_DEACTIVATED`: `revokedAt: null, club: { deactivatedAt: { not: null } }`
    - `REVOKED`: `revokedAt: { not: null }`

    The raw `status` (`ACTIVE`/`REVOKED`) isn't returned, so nothing can show "Active" for a trainer without access.
  - The invited email is resolved with one follow-up `clubTrainerInvitation.findMany`: status `ACCEPTED`, `(clubId, acceptedByUserAccountId)` in the page's pairs, ordered by `respondedAt desc`. The `listClubTrainers` mapping is extracted into a shared helper so the two lists agree.
  - Output per row: `{ id, access, createdAt, revokedAt, invitedEmail, club: { id, slug, name, isActive } }`. It never includes `userAccountId`.
- **`listActions`:**
  - The `where` is built from `action` and from `clubId`: `OR: [{ targetType: 'club', targetId: clubId }, { metadata: { path: ['clubId'], equals: clubId } }]`. The JSON path filter is a Prisma feature on PostgreSQL, not raw SQL. Ordered by `createdAt desc, id desc`.
  - Select: `id, action, targetType, targetId, metadata, createdAt, actorUserAccountId, actor: { select: { supabaseUserId } }`.
  - **Club names:** the club ids of the page are collected from `targetId` (club targets) and `metadata.clubId`, then fetched with one `club.findMany({ where: { id: { in } }, select: { id, name } })`.
  - **Metadata:** parsed with `adminActionMetadataSchema.safeParse`. On failure the entry gets an empty `details`, so a malformed old row can't break the page. The output keeps only `changedFields` and the three cancelled counts; `clubId` and `closedExpiredInvitationId` are dropped.
  - **Actor:** `actor: { isYou: actorUserAccountId === ctx.admin.userAccountId, email: string | null }`. The email is null for the caller's own rows, since the page says "You", which saves a lookup. `actorUserAccountId`, `supabaseUserId` and `requestId` never leave the service.
- **`listClubs` `query`:** `OR: [{ name: { contains, mode: 'insensitive' } }, { slug: { contains: query.toLowerCase() } }]`, combined with the status filter.
- **`listClubs` `withoutActiveTrainer`:** adds `trainers: { none: { revokedAt: null } }`, combined with the status filter. It isn't limited to active clubs, so "Deactivated" with it on lists deactivated clubs that have no non-revoked trainer. The overview links to it with `status: ACTIVE`.

### D2. Acting-admin email lookup

- **Port:** a new `AdminDirectory` in `lib/supabaseAdmin.ts`, `getUserEmail(supabaseUserId): Promise<string | null>`. It calls `auth.admin.getUserById` and returns `null` when the user doesn't exist. Unlike `getConfirmedEmail`, it doesn't require a confirmed email, because admins are provisioned out of band. It's created with `createSupabaseAdminDirectory()`, and `admin.listActions` gets it through a router-level factory, as `storage()` is passed today.
- **Cache:** an in-process `Map<supabaseUserId, { email, expiresAt }>` with a 5-minute TTL and at most 100 entries (admins are few). Only successful lookups are cached; errors aren't, so a transient failure retries on the next page load.
- **Per page:** the distinct non-self actors on the page are looked up in parallel. Usually there are one to three, and never more than the page size.
- **Failure:** any error yields `email: null`. A warn log carries `requestId` and the error name only, never the email, the user id or the message.
- **Why an external call in a procedure:** AGENTS.md says not to call external APIs from tRPC procedures. This read is on demand, can't be precomputed into a job, and is bounded by distinct actors and the cache. The alternatives:
  - storing admin emails in our DB, which needs a schema change, and the data would go stale when an auth email changes
  - showing "Another admin", which you rejected

  The exception is listed for owner confirmation (task 1.1).
- **Classification:** acting-admin emails are L1-INTERNAL, returned only to admins, and never logged.

### D3. Web pages

- **`/admin` (`app/(admin)/admin/page.tsx`)** replaces the redirect with the overview:
  - six count cards, plus "Updated <time>" from `generatedAt`. Links:
    - active clubs: `/admin/clubs?status=ACTIVE`
    - deactivated clubs: `/admin/clubs?status=DEACTIVATED`
    - active clubs with no active trainer: `/admin/clubs?status=ACTIVE&trainers=none`
    - active trainers: `/admin/trainers?access=ACTIVE`
  - The pending and expiring invitation cards aren't links, and are rendered as plain text, not as a disabled link. A cross-club invitation list would be a separate change; until then each club's invitations stay on its trainers page.
  - a "Recent activity" panel built from `listActions({ take: 5 })`, with "View all" linking to `/admin/activity`
- **`ADMIN_LANDING` becomes `/admin`.** The sidebar's Manage section becomes Overview (`/admin`), Clubs, Trainers and Activity. `SidebarNav` marks `/admin` current only on an exact match, so it isn't highlighted on every admin page.
- **`/admin/trainers`:**
  - The access filter (Active, Club deactivated, Revoked, All) defaults to Active; its value and the club search (`?access`, `?club`) live in the URL.
  - Access chips: Active (`active` tone), Revoked (`revokedTrainer`), and "Club deactivated" (`pending` tone, like the existing "Inactive club" chip), next to the club name's Deactivated chip.
  - The club search is debounced (300 ms) and sent only once it has 2 or more characters.
  - Uses the shell's table and empty states. A row links to `/admin/clubs/[clubId]/trainers`.
- **`/admin/activity`:**
  - The action `<Select>` (All plus the 7 actions in words) and `?club=<id>` filters live in the URL. A club filter shows a dismissible chip with the club's name, from the first row or a `getClub` call.
  - Each entry: a sentence ("You deactivated Liga de Atletismo de Bogotá"), the time, and details ("Changed: name, city"; "Cancelled: 1 certification request, 1 athlete invitation, 1 trainer invitation").
  - The action wording lives in a pure `describeAdminAction()` helper.
- **Club detail:** a "View activity" link to `/admin/activity?club=<id>`.
- **Club list "No active trainer" filter:** a toggle next to the status filter, kept in `?trainers=none` and sent as `withoutActiveTrainer: true`. The empty state reads "Every club here has an active trainer".
- **Club list search:**
  - a search box above the table, debounced, in `?q=`, and only sent with 2 or more characters
  - a no-match state with "Clear search"
  - The infinite-query key includes `query`.

### D4. Cache invalidation

The admin mutation hooks (`hooks/admin.ts`) already invalidate club lists and details. Each also invalidates `admin.getOverview` and `admin.listActions`. Trainer revocation and invitation changes also invalidate `admin.listTrainers`. This is backward compatible, since mobile uses no admin hooks.

### D5. Tests in the shared environment

- **Counts:** the integration tests for `getOverview` read the overview, create fixtures (a club, a trainer assignment, invitations expiring in 1 h, 47 h and 72 h, a revoked assignment, a deactivated club), read it again, and assert the **deltas**. Cleanup removes every fixture.
- **Activity:** `listActions` tests filter by a fixture club, so other runs' rows don't interfere.
- **Email lookup:** a fake `AdminDirectory` is injected in integration tests (found, null and throws). One unit test proves the cache serves a second call without a lookup and retries after an error.
- Tests need the Azure container app stopped, as recorded in memory.

## Risks / Trade-offs

- **[External call on a page load]** → Bounded: only distinct non-self actors not in the cache, looked up in parallel. A failure degrades to "An admin" instead of breaking the page.
- **[Admin emails in an API response]** → Only `adminProcedure` returns them, and only for actors who are admins. They're L1, never logged, and the page needs the identity anyway.
- **[A JSON-path club filter without an index]** → The log grows only with admin writes, so it's small. If it grows, add a reviewed migration with a `club_id` column or an expression index (out of scope).
- **[Overview counts are slightly stale]** → They're cached client-side for 60 s and refreshed by every admin mutation. `generatedAt` is shown as "Updated <time>".
- **[Landing moves from `/admin/clubs` to `/admin`]** → Old bookmarks to `/admin/clubs` still work. Only the default landing changes.

## Migration Plan

Additive. Deploy the API first, because the web overview needs `getOverview`. Older web builds ignore the new procedures, and the new `listClubs` input is optional. Rollback is reverting both. No data changes.
