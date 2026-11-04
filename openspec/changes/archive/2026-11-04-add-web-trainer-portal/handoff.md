# Handoff: add-web-trainer-portal

Implementation of every task in `tasks.md`. The owner ran the manual browser checks listed at the end.

## Owner confirmations (task 1.1)

2026-11-04, Cristian: all four items approved as written (invite lookup including the exact-slug path for non-searchable athletes, three procedures on the `club` router, `sport` on roster rows, landing at `/trainer` with the invitations files moved under `(home)`).

## Deviations from the artifacts

- **`listMyTrainerClubs` cursor is the club id**, not the ClubTrainer id. Design D2 said both "the cursor is the ClubTrainer id" and "it never returns the ClubTrainer id"; a cursor is returned as `nextCursor`, so the club id (unique per user through `(clubId, userAccountId)`) keeps the ClubTrainer id out of every response. `design.md` is updated.
- **`useFindAthleteToInvite` uses TanStack's `useInfiniteQuery` with tRPC's query key.** tRPC v11 can't type `useInfiniteQuery` for a discriminated-union input (its `Omit` collapses the union). The hook keeps tRPC's infinite key, so `utils.club.findAthleteToInvite.invalidate()` still matches it. One hook serves both lookups: a slug lookup is a one-page infinite query.
- **The existing roster key test changed.** Task 3.1 says existing roster tests pass unchanged, but `clubs-metrics-visibility.int.test.ts` asserted the roster athlete has exactly `displayName`, `id`, `slug`. Adding the approved `sport` field requires adding it to that list; the test now also asserts the sport.
- **`apps/api/README.md` is new.** Task 3.6 named it, but it didn't exist and no other doc listed router procedures. It documents the `club` router only.
- **The value field accepts a decimal comma** (`44,1`) as well as a point, since trainers in Colombia type commas.

## Changed files

API (`apps/api`)
- `src/services/trainerWorkspace.ts` (new): `rosterWhere`, `rosterSelect`, `listMyTrainerClubs`, `getRosterAthlete`, `findAthleteToInvite`
- `src/services/membership.ts`: `listRoster` uses the shared filter and select
- `src/router/club.ts`: three new procedures
- `src/__tests__/integration/trainer-workspace.int.test.ts` (new)
- `src/__tests__/integration/clubs-metrics-visibility.int.test.ts`: roster sport assertion, 10-minutes-ahead `reportEntry` test
- `README.md` (new)

Validators (`packages/validators`)
- `src/club-membership.ts`: new inputs and outputs, `sport` on roster rows
- `src/clubs-metrics-visibility.test.ts`

API client (`packages/api-client`)
- `src/hooks/club.ts`, `src/hooks/metric.ts`, `src/hooks/achievement.ts`, `src/index.ts`

Web (`apps/web`)
- `lib/auth-flow.ts` (`DEFAULT_LANDING = '/trainer'`), `lib/auth-flow.test.ts` (new), `app/auth/actions.test.ts`
- `app/(admin)/admin/layout.tsx` (no hard-coded `next`)
- `components/portal-shell.tsx` (sidebar `header` slot), `components/status-chip.tsx` and its test (`member`, `waitingAthlete`)
- `app/(trainer)/trainer/layout.tsx` (session check only)
- `app/(trainer)/trainer/(home)/`: `layout.tsx`, `page.tsx`, `clubs/page.tsx`, `invitations/*` (moved, test included)
- `app/(trainer)/trainer/_components/`: `trainer-shell.tsx`, `club-switcher.tsx`, `no-club.tsx`, `not-trainer-of-club.tsx`, `load-failed.tsx`, `load-more.tsx`
- `app/(trainer)/trainer/clubs/[clubId]/`: `layout.tsx` (guard), `page.tsx`, `club-layout.test.tsx`, `athletes/` (roster, invite dialog, tests), `athletes/[athleteId]/` (athlete view, log metric dialog, tests), `certifications/` (queue, tests)
- `lib/trainer/`: `landing.ts`, `my-clubs.ts`, `my-clubs-limit.ts`, `errors.ts`, `athlete-query.ts`, `metric-catalog.ts`, `measured-at.ts`, `use-trainer.ts`, and unit tests
- `lib/trainer-mutations.test.tsx` (new), `test/trpc-stub.tsx` (new)
- `README.md`

Docs
- `docs/project-architecture.md` ("Web trainer portal")
- `docs/design-handoff/README.md` ("Trainer portal" exceptions), `docs/design-handoff/CHANGELOG.md`

## Spec requirements and their tests

`trainer-club-workspace`
- A user lists the clubs they train: `trainer-workspace.int.test.ts` › `club.listMyTrainerClubs`
- Roster rows include the athlete's sport: `trainer-workspace.int.test.ts` › `club.listRoster`, `clubs-metrics-visibility.int.test.ts` › `club.listRoster`
- A trainer opens one roster athlete: `trainer-workspace.int.test.ts` › `club.getRosterAthlete`
- A trainer looks up an athlete to invite: `trainer-workspace.int.test.ts` › `club.findAthleteToInvite`

`trainer-access-boundary` (modified "Trainers read only club-scoped data")
- Invite lookup, non-searchable athlete without the slug, other clubs' memberships, another trainer's pending invitation: `trainer-workspace.int.test.ts`

`web-trainer-portal-view`
- A trainer lands on their club: `lib/auth-flow.test.ts`, `lib/trainer/landing.test.ts`, `app/auth/actions.test.ts`
- The trainer can switch clubs, and club pages refuse other clubs: `clubs/[clubId]/club-layout.test.tsx`
- The trainer sees the club roster, and invites an athlete: `athletes/roster.test.tsx`, `lib/trainer/athlete-query.test.ts`
- The trainer views an athlete's metrics, and logs a metric entry: `athletes/[athleteId]/athlete.test.tsx`, `lib/trainer/measured-at.test.ts` (UTC+14 and UTC−5), `lib/trainer/metric-catalog.test.ts`
- The trainer decides certification requests: `certifications/certifications.test.tsx`
- Access lost meanwhile, and the error mapping: `lib/trainer/errors.test.ts`
- Data stays current: `lib/trainer-mutations.test.tsx`
- Trainer pages show only what the trainer API returns: `athlete.test.tsx` (no trainer id), `trainer-workspace.int.test.ts` (no bio, measurements, email or L2 key)

## Automated runs

- `turbo typecheck` and `turbo lint`: pass (29 tasks)
- `turbo test`, all packages and apps except `@app/api`: pass (web 177 tests, validators 129)
- `next build`: pass
- `@app/api` typecheck, test and lint (`--force`, Azure container stopped): pass, 35 test files, 435 tests

## Manual checks (owner)

Run by the owner (Cristian) on 2026-11-04, signed in as a seeded trainer.

| Task | Check | Result |
|---|---|---|
| 6.2 | Invite by pasted profile link | pass |
| 6.2 | Invite by name search | pass |
| 6.2 | Duplicate invite shows the conflict message | pass |
| 6.2 | Unknown slug shows "No athlete found" | pass |
| 6.2 | A non-searchable athlete is found only by link | pass |
| 7.2 | Log an entry for a seeded active member; the summary changes | pass |
| 8.1 | Approve and reject seeded requests; the achievement status changes on mobile | pass |
| 10.1 | A trainer of two clubs switches clubs | pass |
| 10.1 | An athlete opening `/trainer` sees the no-club message | pass |
| 10.1 | Another club's URL shows "not a trainer of this club" | pass |
