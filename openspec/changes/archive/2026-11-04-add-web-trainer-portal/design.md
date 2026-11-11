# Design

## Context

- **The trainer API exists:** `club.listRoster`, `club.inviteAthlete`, `metric.listDefinitions`, `metric.listEntries`, `metric.getSummaries`, `metric.reportEntry`, `achievement.listPendingCertifications` and `achievement.decideCertification`.
  - Each trainer procedure is a `trainerProcedure` taking `clubId`.
  - An unknown club answers `NOT_FOUND`.
  - A caller who isn't a non-revoked trainer of an active club answers `FORBIDDEN`.
- **Gaps the pages hit:**
  - No procedure lists the caller's trainer clubs.
  - No procedure returns one roster athlete.
  - `athlete.searchAthletes` and `athlete.getPublicProfile` return profile details but no display name or handle, so they can't drive an invite picker.
  - `metric.listDefinitions({ sportId })` returns only that sport's metrics, not the general ones (`sportId` null).
- **Ambiguous errors:**
  - `FORBIDDEN` from `reportEntry` and `decideCertification` means either "you're no longer a trainer of this club" or "this athlete's membership is no longer active".
  - A request that's no longer pending answers `BAD_REQUEST`.
- **The web shell** (`add-web-portal-shell`) provides the session, the `/api/trpc` proxy, `createServerApi()` for Server Components, `PortalShell`, the components and the `onUnauthorized` redirect.
  - The trainer layout today is static, with one nav item: Invitations.
  - `chooseLanding` sends non-admins to `/trainer/invitations`.

## Goals / Non-Goals

**Goals:**
- Each new read applies the same club and visibility filter as its list counterpart (AGENTS.md: list and detail filter alike).
- Club access on a page is decided once, server-side, from the caller's own clubs. The API stays the authority on every call.

**Non-Goals:**
- No schema, migration, RLS or dependency changes.
- No change to how the existing procedures authorize. `searchAthletes` and `getPublicProfile` are left as they are.

## Decisions

### D1. Routes and layouts

```
app/(trainer)/trainer/
  layout.tsx                      session check only (no shell)
  (home)/layout.tsx               PortalShell, generic nav: Clubs, Invitations
  (home)/page.tsx                 /trainer: 0 clubs → message; 1 → redirect; n → redirect /trainer/clubs
  (home)/clubs/page.tsx           club picker
  (home)/invitations/…            existing page, moved under (home) unchanged
  clubs/[clubId]/layout.tsx       guard + PortalShell with club nav and switcher
  clubs/[clubId]/page.tsx         → redirect to athletes
  clubs/[clubId]/athletes/page.tsx
  clubs/[clubId]/athletes/[athleteId]/page.tsx
  clubs/[clubId]/certifications/page.tsx
```

- **Club layout guard:** `clubs/[clubId]/layout.tsx` calls `club.listMyTrainerClubs` through `createServerApi()`, requesting up to 50 clubs, the page maximum. It looks for `clubId` in the result:
  - Not found: it renders `NotTrainerOfClub` and no children, so no club query runs.
  - Found: it renders the shell with the club's name, the nav (Athletes, Certifications, Trainer invitations), and a club switcher listing the other clubs.
- **Why one guard in a layout:** per-page guards would repeat the same call, and a client-side guard would flash the page before refusing.
- **Shell placement:** route groups let the club pages get a different shell from `/trainer` and `/trainer/invitations` without duplicating the session check.
- **Landing:** `DEFAULT_LANDING` becomes `/trainer`, and `/trainer/page.tsx` decides where to go.
  - The shell's layout redirects (`/login?next=%2Ftrainer%2Finvitations`) change to `/trainer`.
  - The return-path issue the shell audit found is fixed along the way: the layout no longer hard-codes a page, because middleware already supplies the exact `next`.

### D2. New procedures on the `club` router

All three use explicit `select`, and their schemas live in `packages/validators/src/club-membership.ts`.

| Procedure | Auth | Input | Output |
|---|---|---|---|
| `listMyTrainerClubs` | `protectedProcedure` | `paginationInput` | `paginatedOutput({ club: clubPublicOutput })` |
| `getRosterAthlete` | `trainerProcedure` | `{ clubId, athleteId }` | `clubRosterEntryOutput` |
| `findAthleteToInvite` | `trainerProcedure` | discriminated union on `by` (below) | `paginatedOutput(athleteToInviteOutput)` |

- **`listMyTrainerClubs`:**
  - Selects `ClubTrainer` rows where `userAccount.supabaseUserId = ctx.userId`, `revokedAt` null and `club.deactivatedAt` null, ordered by club name, then id. The cursor is the club id, resolved through the unique `(clubId, userAccountId)` pair, so no ClubTrainer id ever leaves the API.
  - It never returns the ClubTrainer id or the user id.
  - Built on `protectedProcedure`, not `trainerProcedure`, because it has no `clubId` and must answer an empty list to non-trainers.
- **`getRosterAthlete`:**
  - Uses the same `where` as `listRoster`, extracted into a shared `rosterWhere(trainer)`: `ACTIVE`, or `PENDING_ATHLETE_CONFIRMATION` invited by this trainer. It adds `athleteId`.
  - Returns `NOT_FOUND` when nothing matches. Ended, rejected and other trainers' pending rows look identical to "never a member", so nothing leaks.
- **`findAthleteToInvite`** input:
  - `{ clubId, by: 'name', query: string(2..100, trimmed), cursor?, take? }`, or
  - `{ clubId, by: 'slug', slug: slugSchema }`.

  Behavior:
  - **By name:** `athlete.profileStatus = ACTIVE`, `publicProfile.isSearchable = true`, and `displayName contains query` (case-insensitive), ordered by `displayName` then `id`. Pages default to 20 and are capped at 50.
  - **By slug:** an exact `slug` match with `profileStatus = ACTIVE`, regardless of `isSearchable`. It returns zero or one row, and `nextCursor` is always null.
  - **Output per row:** `{ athlete: { id, slug, displayName, sport: { id, name } }, relation: 'MEMBER' | 'INVITED_BY_YOU' | null }`.
  - **No other club's data:** the athlete select never includes `memberships` without a `where: { clubId: trainer.clubId }`, and no output schema has a field for another club. Integration tests assert that another club's id and name are absent from the serialized response (task 3.4).
  - **Computing `relation`:** a nested `memberships` select on this club with `status in (ACTIVE, PENDING_ATHLETE_CONFIRMATION)`, selecting `status` and `invitedByClubTrainerId`, mapped in code. A pending row from another trainer maps to `null` (spec: don't reveal it); `inviteAthlete` answers `CONFLICT` for it.
  - **Why not extend `searchAthletes`:** it's public and anonymous. Adding names there, or adding a handle lookup that ignores `isSearchable`, would widen public exposure. A trainer-scoped procedure confines the exception to authenticated trainers and is rate-limited per user.
- **Roster output:** `clubRosterEntryOutput.athlete` gains `sport: { id, name }` (L0-PUBLIC). `rosterWhere` serves both the list and the detail; the select is shared too.
- **Service file:** a new `services/trainerWorkspace.ts`. It holds the three procedures, `rosterWhere` and the shared select; `membership.ts`'s `listRoster` imports them.

### D3. Finding athletes in the invite dialog

- **One field, interpreted client-side:**
  - A value that parses as a URL whose path is `/athlete/<slug>`, from any host, becomes `by: 'slug'`. Only the slug is used; the host is ignored, since the lookup is an exact match.
  - So does `@<slug>`, or a bare string that matches `slugSchema` and has no spaces.
  - Anything else of two or more characters becomes `by: 'name'`.
  - A slug that finds nothing also falls back to a name search for the same text. The two result sets are shown in one list, with duplicates removed by id.
- Searches are debounced (300 ms) and use `useInfiniteQuery` for "Load more".
- **Invite:** `club.inviteAthlete({ clubId, athleteId })`. `CONFLICT` shows the spec's conflict message. Success shows "Invitation sent. <Name> must confirm before joining", and the roster is invalidated.

### D4. Metric catalog in the log dialog

- The dialog loads every active definition: an infinite `metric.listDefinitions({ take: 50 })` without `sportId`, fetching all pages, since the catalog is small public reference data. It keeps `sportId === athlete.sport.id || sportId === null`, grouped "Sport metrics" then "General".
- **Alternative rejected:** changing `listDefinitions` so `sportId` also returns general metrics changes a public contract other callers rely on. Two queries (by sport, plus all with a client filter) cost more than one.
- **Form:** metric `<Select>`, value input (`inputMode="decimal"`, parsed with `Number`, finite), and measured date (`<input type="date">`, max today in the trainer's local time zone). The unit is shown next to the value.
- **Date to `measuredAt`:** `metric.reportEntry` takes a timestamp and rejects one more than 5 minutes in the future (`MAX_FUTURE_SKEW_MS`). A fixed local time of day doesn't work: local noon "today" is still in the future for anyone saving before noon. So a pure helper `measuredAtFor(day, now)` decides:
  - **today** (the trainer's local date of `now`): send `now`, the moment of saving
  - **an earlier day:** send that day at 12:00 local time. This is always before `now`, because today's local midnight has already passed.
  - **a later day:** the form refuses it before sending
- **Why not change the API to take a date:** it would change the public `reportMetricEntryInput` contract and the mobile summaries' ordering by timestamp. The server rule stays as it is, and an integration test pins it: an entry stamped with the request time is accepted, and one 10 minutes ahead is rejected.
- **Clock skew:** if the device clock runs more than 5 minutes fast, the API answers `BAD_REQUEST`. The dialog shows "The date can't be in the future. Check your device's date and time." and keeps the form.
- **On success:** invalidate `metric.getSummaries({ athleteId })` and `metric.listEntries({ athleteId })`.

### D5. Entry attribution

- Entries come from `metric.listEntries`, which returns entries from any club the viewer may see.
- The UI labels an entry "Reported by <club name>" when `entry.clubId === clubId`, and "Reported by another club" otherwise. `reportedByClubTrainerId` is never displayed. This matches the handoff's club-only attribution.

### D6. Interpreting FORBIDDEN, NOT_FOUND and BAD_REQUEST on trainer pages

- **Queries:**
  - `FORBIDDEN` or `NOT_FOUND` for the club: access was lost after the layout check. The page calls `router.refresh()`, so the layout guard runs again and renders `NotTrainerOfClub`.
  - `NOT_FOUND` from `getRosterAthlete`: "athlete not found".
- **`reportEntry` / `decideCertification` `FORBIDDEN`:**
  - The page refetches `club.listMyTrainerClubs`. If the club is gone, `router.refresh()` shows the not-a-trainer page.
  - Otherwise it's the membership: show "no longer an active member" and invalidate the athlete or the queue.
- **`decideCertification` `BAD_REQUEST` or `NOT_FOUND`:** "no longer pending", then invalidate the queue.
- A small pure helper, `trainerErrorNotice(code, stillTrainer)`, holds this mapping so it can be unit-tested. It follows the pattern of `noticeForError` on the invitations page.

### D7. Cache invalidation

| Mutation | Invalidates |
|---|---|
| `club.inviteAthlete` | `club.listRoster({ clubId })`, `club.findAthleteToInvite` |
| `metric.reportEntry` | `metric.getSummaries({ athleteId })`, `metric.listEntries({ athleteId })` |
| `achievement.decideCertification` | `achievement.listPendingCertifications({ clubId })` |

The existing hooks in `@packages/api-client/src/hooks/{club,metric,achievement}.ts` gain these `onSuccess` invalidations. They're backward compatible for mobile, which calls none of these mutations.

## Risks / Trade-offs

- **[Exact-slug lookup finds non-searchable athletes]** → It returns only public identity, and only to authenticated trainers of an active club. The handle is already the public profile URL's identifier, so whoever has it can see the public page anyway. This is recorded as an explicit spec exception in `trainer-access-boundary`.
- **[Name search could enumerate searchable athletes]** → Only athletes who opted into search, with a minimum of 2 characters, pages capped at 50 and per-user rate limiting. The data is the same as what public search shows by design.
- **[`listMyTrainerClubs` in the layout adds one API call per club page navigation]** → One indexed query. The same call also yields the club name and the switcher.
- **[Client-side catalog filtering fetches every definition]** → The catalog is small, public reference data, cached by TanStack Query for 60 s.
- **[Route regrouping moves `/trainer/invitations` files]** → The URL doesn't change. The invitations tests move with the files.

## Migration Plan

Additive. The new procedures and the extra roster field deploy with the API before or with the web build. Older web builds ignore the extra field, and mobile doesn't use the roster. Rollback is reverting both; no data changes.
