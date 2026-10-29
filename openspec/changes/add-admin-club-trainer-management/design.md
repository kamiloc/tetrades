# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Accounts and roles.**
  - `UserRole` is `ATHLETE | SYSTEM`.
  - `supabase/constraints/auth_user_bootstrap.sql` creates every `user_accounts` row as `ATHLETE` / `PENDING`, and only `athlete.bootstrap` moves it to `ACTIVE`.
  - `requireViewer` doesn't check status, so accounts without an athlete profile can already call the API.
  - Seeded trainers are already trainer-only accounts (`prisma/seed.ts`). The test helpers (`tests/rls/helpers/setup.ts`, `apps/api/src/__tests__/integration/helpers/setup.ts`) make full athlete users into trainers.
- **Roles and rate limiting.** `lib/userRole.ts` resolves the role with a 60-second TTL cache, used **only** for rate-limit tiers (`middleware/auth.ts`: "never for authorization decisions"). `ADMIN_ROLES` is `{'SYSTEM'}`.
- **The verified email is available but dropped.** `verifyAccessToken` (`@packages/auth`) calls `auth.getUser` and returns `email`, but not whether it's confirmed. `verifyAuthToken` drops it, and the tRPC context has only `userId`.
- **Trainer authority.**
  - It comes from `trainerProcedure` → `requireClubTrainer`, which checks the club exists and a `ClubTrainer(clubId, userAccountId)` row exists. `ClubTrainer` has `@@unique([clubId, userAccountId])` and `onDelete: Restrict`.
  - RLS policies on `club_memberships`, `athlete_metric_entries` and `achievement_certification_requests` resolve "caller is a trainer of club X" with subqueries on `club_trainers`.
  - The trigger `athlete_metric_entry_active_membership.sql` checks the `ACTIVE` membership for every writer.
- **Lock order.** Certification and leave serialize on row locks in one order: membership (`FOR SHARE`), then achievement (`FOR UPDATE`), then request (approved raw SQL in `services/certification.ts`).
- **Membership transitions.** `club_membership_transitions.sql` allows `PENDING_ATHLETE_CONFIRMATION → REJECTED` from any writer.
- **`clubs` read access.** `clubs_select_public` lets `anon` and `authenticated` read every row, so every column is client-readable today, including the L1 `created_at`.
- **Database role.** The API's Prisma connection uses the `postgres` user in `DATABASE_URL` (Supabase pooler). On Supabase that role bypasses RLS, which is how the API writes tables that have FORCE RLS and no client write policies. Client roles are `anon` and `authenticated`.
- **`audit_log` can't take admin actions.** It requires a non-null `athlete_id` (FK `Restrict`), so the owner chose a separate `admin_action_log`.
- **`deletePII`** (`services/dataLifecycle.ts`):
  - deletes athlete rows
  - deletes the Supabase auth user
  - tombstones the athlete and account
  - verifies by counting residual rows per table

  `requestDeletion` requires an athlete profile.
- **Jobs and notifications.**
  - BullMQ queues live in `@packages/queue` (`QUEUE_NAMES`), workers in `apps/api/src/jobs/`. No recurring (scheduled) job exists yet.
  - Push copy is fixed per type in `services/notifications.ts` (Spanish).

## Goals / Non-Goals

**Goals:**
- Only a role the owner sets in the database reaches admin procedures, and losing it takes effect on the next call.
- Revoking a trainer or deactivating a club cuts access on every path (API, RLS, triggers), including writes already in progress.
- No database path trusts an unconfirmed email. No client can read an L1 column the API hides.
- Each account has exactly one capacity, enforced in the database.
- Personal data in trainer invitations has a bounded lifetime.

**Non-Goals:**
- Web UI (`add-web-portal-shell`).
- Self-deletion for trainer-only accounts (D14).
- Sending invitation email.
- Admin read access to athletes, memberships, metrics or certifications.

## Decisions

### D1. `ADMIN` is a `UserRole` value; `adminProcedure` reads it fresh
Add `ADMIN` to `UserRole` (Prisma and `userRoleEnum`). `adminProcedure = protectedProcedure.use(...)` loads `UserAccount.role` by `supabaseUserId = ctx.userId` with an uncached `select`, throws `FORBIDDEN` unless it's `ADMIN`, and adds `ctx.admin = { userAccountId }`.
- *Why not the rate-limit cache:* a 60-second stale role would let a removed admin keep acting.
- `ADMIN_ROLES` becomes `{'SYSTEM', 'ADMIN'}`.
- No procedure writes `role`.

### D2. Only a confirmed email enters the context
- `verifyAccessToken` returns `email` only when `data.user.email_confirmed_at` is set; otherwise `null`. This is a small `@packages/auth` change with no new export. Its other caller, `verifyToken`, gets the same behavior, so no path treats an unconfirmed email as proof.
- `AuthResult` (authenticated case) gains `email`, and `Context` gains `userEmail = email?.trim().toLowerCase() ?? null`.
- The email is L1. It's never logged in error messages or returned in errors. Only the trainer-invitation procedures and `deletePII` read it.
- **Trust assumption (stated in ADR-017 and the threat model):** an email proves inbox ownership only when Supabase has confirmed it. With Magic Link and OTP as the only sign-in methods, confirmation happens by completing the link or code. The project keeps Supabase's "Confirm email" and "Secure email change" settings on. This change doesn't rely on that alone, though: the `email_confirmed_at` check holds even if a user is created unconfirmed (dashboard or admin API) or a setting is turned off later.
- *Alternative rejected:* trusting `auth.jwt()->>'email'`. Presence of the claim doesn't mean the address was verified.

### D3. `ClubTrainerInvitation` model
| Field | Level | Notes |
| --- | --- | --- |
| `id` | L1 | cuid |
| `clubId` | L1 | FK `Club`, `Restrict` |
| `email` | L1 | lowercased; Zod `email()`, max 254; `CHECK (email = lower(email))`; replaced by `redacted:<id>` on redaction |
| `status` | L1 | enum `TrainerInvitationStatus`: `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED` |
| `invitedByUserAccountId` | L1 | FK `UserAccount` (the admin), `Restrict` |
| `acceptedByUserAccountId` | L1 | nullable; set on accept |
| `expiresAt` | L1 | `createdAt + 14 days` |
| `respondedAt` | L1 | nullable; accept, decline or revoke time |
| `redactedAt` | L1 | nullable; set when the email is redacted |
| `createdAt` | L1 | |

- **Case-insensitive uniqueness is a database guarantee.** `CHECK (email = lower(email))` plus the expression index `UNIQUE (club_id, lower(email)) WHERE status = 'PENDING'`. Either one alone would be enough for case-insensitivity. The CHECK also keeps lookups simple. Both are hand-edited into the migration and mirrored in `supabase/constraints/club_trainer_invitation_open_unique.sql`.
- **Transitions:** enforced by `supabase/constraints/club_trainer_invitation_transitions.sql`. Rows are inserted as `PENDING`; only `PENDING → ACCEPTED | DECLINED | REVOKED` is allowed; `club_id`, `invited_by_user_account_id` and `created_at` are immutable. `email` may change only to `'redacted:' || id` with `redacted_at` set (D13).
- **"Expired" is derived**, not stored: `PENDING` and `expiresAt <= now()`. Outputs return a computed `state` (`PENDING | EXPIRED | ACCEPTED | DECLINED | REVOKED`). `inviteTrainer` first moves an expired `PENDING` row for the same (club, email) to `REVOKED` in its transaction, so the unique slot frees up.
- A unique violation maps to `CONFLICT`.

### D4. Accepting, declining and listing invitations
A new `trainerInvitation` router (`protectedProcedure`) holds `listMine`, `accept` and `decline`. The caller isn't an admin, and the `club` router is about memberships.

`accept` runs in one transaction:
1. `lockActiveClub` (D7), then lock the invitation `FOR UPDATE`.
2. Require `ctx.userEmail !== null`, `email = ctx.userEmail`, `status = PENDING` and `expiresAt > now()`. A mismatch or null email returns `NOT_FOUND`, so invitation ids can't be probed.
3. Require that the caller's account has no athlete profile and `role !== 'ADMIN'`; otherwise `FORBIDDEN` (D12).
4. Upsert `ClubTrainer(clubId, userAccountId)`, clearing `revokedAt` on an existing revoked row. That's "return after revocation", and it keeps one row per (club, user). Set the invitation to `ACCEPTED` with `acceptedByUserAccountId`.

`decline` repeats steps 1–2 and sets `DECLINED`. `listMine` returns `PENDING`, unexpired invitations for `ctx.userEmail` with club L0 fields, or an empty list when the email is null.

### D5. Revocation and the club lifecycle columns
- **`ClubTrainer.revokedAt` (L1).** It's set by `admin.revokeTrainer` and cleared only by D4's accept.
- **`Club.deactivatedAt` (L1).** It's set by `admin.deactivateClub` and cleared by `admin.reactivateClub`.
- **`isActive` in outputs.** `clubPublicOutput` gains `isActive: boolean` (L0, derived). The timestamps appear only in admin outputs.
  - **BREAKING (contract):** `clubPublicOutput` gains a required field. Every consumer is in this repo and changes with it.
- **`requireClubTrainer`** throws one `FORBIDDEN` message for every failure (no row, revoked, or club deactivated), so the reason isn't revealed. The certification-notification trainer query filters `revokedAt: null`.

### D6. RLS, grants and triggers (each needs owner confirmation)
- **`public.club_is_active(club_id text) RETURNS boolean`.** `STABLE SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` granted to `authenticated`. Policies call it instead of reading `deactivated_at`, because the column becomes unreadable to client roles and policy expressions run with the caller's privileges.
- **`clubs` column grants** (in `clubs.sql`): `REVOKE SELECT ON public.clubs FROM anon, authenticated; GRANT SELECT (id, slug, name, country_code, city) ON public.clubs TO anon, authenticated;`. `clubs_select_public` stays as is, so rows are still public but only through those columns. This also stops the existing exposure of the L1 `created_at`. Tests that select `*` from `clubs` as a client switch to explicit columns.
- **Trainer subqueries.** In `club_memberships.sql`, `athlete_metric_entries.sql` and `achievement_certification_requests.sql`, every `club_trainers` subquery (USING and WITH CHECK) adds `ct.revoked_at IS NULL AND public.club_is_active(ct.club_id)`. `club_trainers_select_own` is unchanged, so a trainer can still see their own revoked rows.
- **`athlete_metric_entry_active_membership.sql`** also requires the reporting trainer row to be non-revoked and its club active, for every writer.
- **New `club_trainer_invitations.sql`.** ENABLE + FORCE RLS and **no policies** for `anon` or `authenticated`, plus `REVOKE ALL ... FROM anon, authenticated`. Only the API reads and writes invitations (D2 and D4 enforce the confirmed-email rule). With no client policy, no database path trusts the JWT email claim. The header states this and the trust assumption.
- **New `admin_action_log.sql`.** ENABLE + FORCE RLS, no policies for client roles, and `REVOKE ALL ... FROM anon, authenticated`. The API inserts through the `postgres` connection, which bypasses RLS on Supabase. A task verifies `rolbypassrls` for the `DATABASE_URL` role, so the header states a checked fact.
- **New `supabase/constraints/account_single_capacity.sql`** (D12).
- The full `tests/rls/` suite runs after these edits.

### D7. Concurrency: club, then trainer row, then the existing order
The global lock order becomes **club → club_trainer → membership → achievement → request**.
- `lockActiveClub(tx, clubId)`: `SELECT 1 FROM clubs WHERE id = $1 AND deactivated_at IS NULL FOR SHARE`.
- `lockActiveTrainer(tx, clubTrainerId)`: `SELECT 1 FROM club_trainers WHERE id = $1 AND revoked_at IS NULL FOR SHARE`.
- Each returns no row when the club is deactivated or the trainer revoked, and the caller throws `FORBIDDEN`.
- **Trainer writes** (`inviteAthlete`, `reportEntry`, `decideCertification`) call both, in that order, first inside their existing transactions. `requestCertification` (athlete) and invitation `accept` call `lockActiveClub`.
- **`deactivateClub`** locks the club `FOR UPDATE`, sets `deactivatedAt`, then cancels in lock order: memberships (`PENDING_ATHLETE_CONFIRMATION` → `REJECTED`), certification requests (achievements through `lockAchievements`, then `CANCELLED` and `UNVERIFIED`), and trainer invitations (`PENDING` → `REVOKED`).
- **`revokeTrainer`** locks the club `FOR SHARE`, then the trainer row `FOR UPDATE`, and sets `revokedAt`.
- **Effect:** a trainer write either commits before the revocation or deactivation (which then waits on its lock), or finds the row gone and fails. **Reads** (`listRoster`, `listPendingCertifications`) take no lock: one already past `requireClubTrainer` may finish, as the spec allows.
- These are raw-SQL lock helpers next to the approved ones in `services/certification.ts`. AGENTS.md requires explicit `$queryRaw` approval.

### D8. `AdminActionLog`
| Field | Level | Notes |
| --- | --- | --- |
| `id` | L1 | cuid |
| `actorUserAccountId` | L1 | FK `UserAccount`, `Restrict` |
| `action` | L1 | enum `AdminAction`: `CLUB_CREATED`, `CLUB_UPDATED`, `CLUB_DEACTIVATED`, `CLUB_REACTIVATED`, `TRAINER_INVITED`, `TRAINER_INVITATION_REVOKED`, `TRAINER_REVOKED` |
| `targetType` | L1 | `club`, `club_trainer`, `club_trainer_invitation` |
| `targetId` | L1 | cuid |
| `requestId` | L1 | from context |
| `metadata` | L1 | ids, counts and changed field **names** only (e.g. `{ cancelledRequests: 2 }`). Never an email, never L2. |
| `createdAt` | L1 | |

- It's written in the same transaction as the admin write, so a rolled-back write leaves no log row.
- It's retained for 5 years like `audit_log`. That purge job joins the existing tombstone-purge follow-up and isn't built here.
- Each admin service also logs a Pino `info` line with `requestId`, action and target id.

### D9. The `admin` router surface
All procedures use `adminProcedure` with schemas from `@packages/validators`:
- `whoAmI` (`{ isAdmin: true }`, for the web change)
- `createClub`
- `updateClub` (`.strict()`, so a `slug` key is `BAD_REQUEST`)
- `listClubs` (cursor, `take` 20/50, `status` filter, `activeTrainerCount` through `_count`)
- `getClub`
- `deactivateClub` (returns cancelled counts)
- `reactivateClub`
- `listClubTrainers` (trainer `id`, status, dates, and `invitedEmail` from the invitation that created or restored the row; null when provisioned before invitations or redacted)
- `listClubTrainerInvitations`
- `inviteTrainer` (returns the invitation id, state and `expiresAt` for the admin's instructions)
- `revokeTrainerInvitation`
- `revokeTrainer`

The logic lives in `services/adminClubs.ts` and `services/trainerInvitations.ts`. Both new routers are merged in `router/index.ts`, which needs owner confirmation.

### D10. Mobile
- `clubs.tsx` shows an "Inactive club" chip (existing chip, `pending` tone) on memberships whose `club.isActive` is false, with Leave still available.
- When `athlete.bootstrap` returns `FORBIDDEN` for a trainer account, onboarding shows: "This is a trainer account. Use the web portal to work with your club." (The copy is added to the handoff README.)

### D11. Closed-invitation push
- `NotificationType` in `@packages/queue` gains `CLUB_INVITATION_CLOSED`. `PUSH_COPY` adds "Invitación de club cerrada" / "Una invitación de club ya no está disponible." It names no club.
- `deactivateClub` enqueues one job per closed invitation **after** its transaction commits, with ids only (recipient account, type, membership id, `requestId`).
- A failure to enqueue is logged at `warn` and never fails the deactivation, the same as `CERTIFICATION_DECIDED`.

### D12. One capacity per account
- **API:**
  - `athlete.bootstrap` rejects `role !== 'ATHLETE'` or any `ClubTrainer` row for the account (`FORBIDDEN`, with a message for trainer accounts).
  - `trainerInvitation.accept` rejects accounts with an athlete profile or role `ADMIN` (D4).
- **Database:** `supabase/constraints/account_single_capacity.sql` adds `BEFORE INSERT` triggers.
  - On `club_trainers`: reject when an `athletes` row exists for the account, or the account's role is `ADMIN`.
  - On `athletes`: reject when a `club_trainers` row exists for the account, or the role isn't `ATHLETE`.
  - The triggers serialize on the `user_accounts` row (`SELECT ... FOR UPDATE`), so two concurrent inserts can't both pass.
- **Tests:** both test-helper `addClubTrainer` functions create a dedicated trainer-only account (a new `createTrainerUser` in the RLS helpers). Tests that used one user as athlete and trainer are updated to use two users. This is a test-only change; no test file is deleted.
- *Alternative rejected:* a new `TRAINER` role value. Trainer authority is per club and comes from `ClubTrainer` rows (ADR-013). A role would duplicate it and could disagree with it.

### D13. Retention: the 90-day invitation email redaction
- A new queue `trainer-invitation-redaction`, a payload type `{ requestId: string }`, and a worker `apps/api/src/jobs/redactTrainerInvitations.ts`. It has the queue defaults: 3 retries, exponential backoff.
- It's scheduled daily with BullMQ's job scheduler (`upsertJobScheduler`) at API startup. This is the project's first recurring job; the pattern is documented in `docs/project-architecture.md` for the later tombstone purge.
- **Rows it redacts:** `redactedAt IS NULL` and either
  - `DECLINED` or `REVOKED` with `respondedAt` more than 90 days ago, or
  - `PENDING` with `expiresAt` more than 90 days ago, or
  - `ACCEPTED` whose `ClubTrainer` row (by club and `acceptedByUserAccountId`) has `revokedAt` more than 90 days ago.
- **How:** set `email = 'redacted:' || id` and `redacted_at = now()` with one set-based update per category, so a failed run leaves already-redacted rows marked and is safe to re-run. It logs counts with `requestId`.

### D14. Deletion
- `deletePII` reads the auth user's confirmed email through the Supabase admin client **before** it deletes the auth user. In the same transaction as the other deletes, it sets every invitation with that email to `REVOKED` (if `PENDING`) and redacts its email.
- `verifyDeletion` adds `club_trainer_invitations: count(email = <that email>)`. Any nonzero count is residue and makes the request `FAILED`.
- The email stays in memory only and is never logged.
- An athlete account never holds `ClubTrainer` rows (D12), so deletion has no trainer records to handle.
- **Known gap:** trainer-only accounts can't request deletion (`requestDeletion` requires an athlete). ADR-017 records that the owner handles these requests manually: revoke the assignments, redact invitations, delete the auth user, tombstone the account. The trainer row stays as an anchor for other athletes' entries. A later change will design trainer self-deletion.

### D15. ADR-017 and docs
`docs/adr/017-platform-admin-trainer-provisioning-and-club-lifecycle.md` records D1–D8 and D11–D14, the ADR-013 §5 amendment (deactivation is a system-initiated path to `REJECTED`; `ACTIVE` memberships survive deactivation), and the D2 trust assumption.

Updated docs:
- `pii-access-matrix.md`: an Admin column; trainer invitations; the admin action log; the `clubs` column grants.
- `threat-model.md`: the admin actor; invitation email trust; a forwarded invitation.
- `data-classification.md`: the new fields.
- `project-architecture.md`: the admin flow; the deactivation flow; trainer surface is web; the scheduled-job pattern.
- The AGENTS.md Habeas Data checklist: trainer invitation email retention.

## Risks / Trade-offs

- **[A compromised admin account can revoke trainers and deactivate clubs]** → No athlete or L2 access. Every write is logged. Both actions are reversible. Admins are few and set by the owner.
- **[An invitation can be passed to someone else]** → Acceptance requires the confirmed invited email. 14-day expiry. The admin sees status and can revoke.
- **[Column grants on `clubs` change what direct clients can select]** → No app client reads `clubs` directly (all reads go through the API). The RLS tests switch to explicit columns. `club_is_active()` keeps the policies working.
- **[`SECURITY DEFINER` helper]** → It returns one boolean for a given id, with a pinned `search_path` and no dynamic SQL. That's the same pattern as `handle_new_auth_user`.
- **[More locks on trainer writes]** → Two `FOR SHARE` locks per write on rows written rarely. The lock order is documented in one place (`services/certification.ts` header).
- **[One-capacity triggers make the test helpers churn]** → A one-time helper change. The trade-off is a database-level guarantee for a rule that matters for privacy: an athlete's account never carries trainer authority.
- **[`clubPublicOutput.isActive` is required]** → Only this repo consumes it, and typecheck finds every site.
- **[Trainer-only accounts can't self-delete]** → A known gap in ADR-017, with a manual procedure meanwhile.

## Migration Plan

1. Zod first, then Prisma; `prisma generate` and `prisma validate`. **Stop:** the owner reviews and runs `prisma migrate dev --name add_admin_club_trainer_management`, with the CHECK and the expression index hand-edited into the migration.
2. Before applying `account_single_capacity.sql`, the owner runs a check query for accounts that have both an athlete and trainer rows. Expected none (seeded trainers are trainer-only); any hit is resolved by hand first.
3. The owner applies the constraint, grant and policy files with `psql -f` after confirming them.
4. The owner confirms Supabase Auth "Confirm email" and "Secure email change" are on (no configuration change expected; D2 doesn't depend on them).
5. Deploy the API, then mobile. Older mobile builds ignore the extra `isActive` field.
6. The owner creates the first admin: invite the email in Supabase Auth, then run `UPDATE user_accounts SET role = 'ADMIN' WHERE supabase_user_id = '<id>';`.

**Rollback:**
- Stop the redaction scheduler.
- To undo the schema, drop the new tables, columns, triggers and helper, and restore the full `clubs` SELECT grant. Null `deactivatedAt` and `revokedAt` give today's behavior.
- Don't remove the enum value while any account holds `ADMIN`.

## Open Questions

- The invitation expiry (14 days) is a constant that can be tuned without changing the specs. The 90-day redaction delay is in the spec, so changing it means a spec update.
