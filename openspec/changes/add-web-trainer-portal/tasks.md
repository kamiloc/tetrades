# Tasks

## 1. Confirmations

- [ ] 1.1 STOP and get the owner's explicit confirmation for each item below (AGENTS.md "Explicit confirmation required" and "trainer-access-boundary"). Verify: the owner's reply is recorded here before task 2.1.
  - `club.findAthleteToInvite`: a trainer-only lookup that returns public identity (`id`, `slug`, `displayName`, sport) of athletes outside the trainer's club. By name it covers searchable athletes only; by exact `slug` it covers any athlete whose profile is `ACTIVE`, searchable or not (design D2, spec exception in `trainer-access-boundary`).
  - Three new procedures on the existing `club` router (`listMyTrainerClubs`, `getRosterAthlete`, `findAthleteToInvite`); no router is added or renamed.
  - Adding `sport` to `clubRosterEntryOutput.athlete` (additive output change).
  - Changing the post-sign-in landing for non-admins from `/trainer/invitations` to `/trainer`, and moving the invitations page files under a route group (URL unchanged; its test moves, none is deleted).

## 2. Validators

- [ ] 2.1 In `packages/validators/src/club-membership.ts`, add:
  - `listMyTrainerClubsInput` and `myTrainerClubListOutput`
  - `getRosterAthleteInput`
  - `findAthleteToInviteInput` (a discriminated union on `by`: `name` with `query` 2–100 trimmed characters and pagination, or `slug` with `slugSchema`)
  - `athleteToInviteOutput` and its list output
  - `sport: { id, name }` on `clubRosterEntryOutput.athlete`

  Every field gets an L0/L1 doc comment, and the schemas are exported from the package index (design D2). Verify with tests in `clubs-metrics-visibility.test.ts`:
  - the inputs accept valid values and reject a 1-character query, a 101-character query, a non-cuid id and an invalid slug
  - the L2 key walk finds no L2 field in any new output
  - no output carries `userAccountId`, `clubTrainerId`, `invitedByClubTrainerId` or an email
  - `yarn turbo run test --filter=@packages/validators` passes

## 3. API procedures

- [ ] 3.1 Create `apps/api/src/services/trainerWorkspace.ts` with the shared `rosterWhere(trainer)` and roster select (now including the athlete's sport), and make `membership.ts`'s `listRoster` use them (design D2). Verify:
  - the existing roster integration tests pass unchanged
  - a new assertion shows each row's `athlete.sport`
  - for a roster athlete who also has an `ACTIVE` membership with club B and `clubMembershipsAudience` `PUBLIC`, the serialized roster response contains neither club B's id nor its name
- [ ] 3.2 Add `club.listMyTrainerClubs` (`protectedProcedure`, explicit `select`, cursor pagination, ordered by club name then id). Verify with integration tests in `apps/api/src/__tests__/integration/`:
  - a trainer of two active clubs gets both
  - revoked and deactivated assignments are excluded
  - an athlete and an admin get an empty list
  - signed out gets 401
  - `take: 51` gets 400
  - the response contains no ClubTrainer id, user id or email
- [ ] 3.3 Add `club.getRosterAthlete` (`trainerProcedure`, `rosterWhere` plus `athleteId`). Verify with integration tests:
  - success for an `ACTIVE` member and for this trainer's own pending invitee
  - 404 for a `COMPLETED`, `REJECTED` and never-member athlete, and for a pending invitee of another trainer
  - 403 for a trainer of another club, and for a revoked trainer
  - 401 signed out
  - 400 for a non-cuid id
  - for an athlete also active in club B (club-membership visibility `PUBLIC`), the response contains neither club B's id nor its name
- [ ] 3.4 Add `club.findAthleteToInvite` (`trainerProcedure`, design D2). Verify with integration tests:
  - by name: returns searchable `ACTIVE` athletes matching case-insensitively, in name order, paginated
  - by name: excludes a non-searchable `ACTIVE` athlete, and searchable athletes whose profile is `DRAFT`, `HIDDEN` or `LOCKED`
  - by slug: returns a non-searchable `ACTIVE` athlete
  - by slug: returns empty for an unknown slug and for a `DRAFT`, `HIDDEN` or `LOCKED` profile, searchable or not
  - `relation`: `MEMBER` for an active member, `INVITED_BY_YOU` for this trainer's pending invitee, and `null` for another trainer's pending invitee (and inviting that athlete answers `CONFLICT`)
  - other clubs: for an athlete with an `ACTIVE` membership with club B and a pending one with club C (club-membership visibility `PUBLIC`), `relation` is `null` and the serialized response contains neither club's id nor name, by name and by slug
  - 403 for another club's trainer; 401 signed out; 400 for a 1-character query
  - the response contains no bio, measurements, email or L2 key
- [ ] 3.5 Pin the existing future-time rule of `metric.reportEntry` that the web date handling relies on (design D4). Verify with integration tests: an entry whose `measuredAt` is the request time is accepted, and one 10 minutes ahead is rejected with `BAD_REQUEST`. If equivalent tests already exist, name them in this task instead of adding duplicates.
- [ ] 3.6 Update `apps/api/README.md` (or the router doc it uses) to list the three procedures. Verify: `yarn turbo run typecheck test lint --filter=@app/api` passes. Ask the owner to stop the Azure container app first, because the API tests share the dev Redis.

## 4. API client

- [ ] 4.1 In `packages/api-client/src/hooks/club.ts`, add `useMyTrainerClubs`, `useRosterAthlete` and `useFindAthleteToInvite` (an infinite query for name search). Add the design D7 `onSuccess` invalidations to `useInviteAthleteToClub`, `useReportMetricEntry` and `useDecideCertification`. Export the new hooks from the package index. Verify:
  - a test with a test `QueryClient` (as in `apps/web/lib/portal-mutations.test.tsx`) proves each mutation invalidates the keys in the D7 table
  - `turbo typecheck` passes for `@app/mobile` with no change there

## 5. Trainer shell, landing and club guard

- [ ] 5.1 Restructure `app/(trainer)/trainer/` as in design D1:
  - session-only `layout.tsx`
  - `(home)` group with the generic shell (Clubs, Invitations)
  - `/trainer` page that redirects by club count
  - `/trainer/clubs` picker
  - invitations moved under `(home)` with its test

  Set `DEFAULT_LANDING` to `/trainer`, and remove the hard-coded `next` in the trainer and admin layouts' unauthorized redirects. Verify:
  - unit tests prove `chooseLanding` returns `/trainer` for a non-admin and `/admin/clubs` for an admin
  - a test of the `/trainer` page logic proves 0 clubs → message with the invitations link, 1 → redirect to `/trainer/clubs/<id>/athletes`, 2 → redirect to `/trainer/clubs`
  - the invitations test still passes
- [ ] 5.2 Build `clubs/[clubId]/layout.tsx` (design D1). It checks `clubId` against `listMyTrainerClubs` through `createServerApi()`, renders `NotTrainerOfClub` for an unknown or untrained club, and otherwise renders the club shell with nav and the club switcher. `clubs/[clubId]/page.tsx` redirects to `athletes`. Verify with a server-rendering test (as in `lib/server-api.test.tsx`):
  - another club's id shows the "not a trainer of this club" page and makes no roster request
  - a trained club shows its name, the nav, and a switcher listing the other club

## 6. Roster and invites

- [ ] 6.1 Build `/trainer/clubs/[clubId]/athletes`:
  - roster table (name, handle, sport, status chip; "Waiting for the athlete" for pending)
  - Load more
  - loading, empty and error states
  - rows linking to the athlete page

  Add `trainerErrorNotice` (design D6) with unit tests covering every branch. Verify: a component test with a stubbed API shows active and pending rows and the empty state.
- [ ] 6.2 Build the invite dialog (design D3):
  - one field with link, slug and name parsing in a pure `parseAthleteQuery` helper
  - debounced lookup and results with relation states
  - invite, success copy, and conflict and not-found messages

  Verify:
  - unit tests for `parseAthleteQuery`: a full profile URL, `@slug`, a bare slug, a name with spaces, and a 1-character input
  - a component test proves picking a result sends `inviteAthlete` and shows the confirm-before-joining copy
  - a `MEMBER` result can't be invited
  - `CONFLICT` shows the conflict message
  - manual: invite by link, invite by name, duplicate invite, unknown slug, a non-searchable athlete found only by link

## 7. Athlete page and metric logging

- [ ] 7.1 Build `/trainer/clubs/[clubId]/athletes/[athleteId]`:
  - `getRosterAthlete`
  - for an active member: summaries (latest and best, with dates and units) and entries with Load more and club attribution (design D5)
  - for a pending invitee: the awaiting-confirmation state
  - an "athlete not found" state for `NOT_FOUND`

  Verify with a component test:
  - an entry of this club is labelled with the club name, another club's with "another club"
  - no element shows a trainer id
  - the pending state shows no metrics
- [ ] 7.2 Build the "Log metric" dialog (design D4):
  - the catalog filtered to the athlete's sport plus general metrics
  - value and date validation (future date rejected)
  - trainer-reported, permanent copy
  - `FORBIDDEN` handled through `trainerErrorNotice`

  Verify:
  - unit tests for the catalog filter
  - unit tests for `measuredAtFor` with a fixed `now`, run under `TZ=Pacific/Kiritimati` (UTC+14) and `TZ=America/Bogota` (UTC−5):
    - today just after local midnight, and today late in the evening, both give `now`, which is not in the future
    - an earlier day gives that day's local noon, before `now`
    - tomorrow is refused
  - a component test proves the clock-skew `BAD_REQUEST` shows the device-time message and keeps the form
  - a component test proves a valid save calls `reportEntry` and refreshes summaries and entries
  - a future date sends nothing
  - manual: log an entry for a seeded active member and see the summary change

## 8. Certification queue

- [ ] 8.1 Build `/trainer/clubs/[clubId]/certifications`:
  - pending list with Load more, and empty, loading and error states
  - Approve with a confirm dialog; Reject with a required reason (validated with the validators' reason schema)
  - "no longer pending" on `BAD_REQUEST`/`NOT_FOUND`, and "no longer an active member" on `FORBIDDEN` while still a trainer (design D6)

  Verify:
  - a component test proves approve removes the row after the queue refresh
  - an empty reason sends nothing
  - `BAD_REQUEST` shows "no longer pending"
  - manual: approve and reject seeded requests, then see the athlete's achievement status change on mobile

## 9. Docs

- [ ] 9.1 Update `apps/web/README.md` (trainer routes, landing), `docs/project-architecture.md` (trainer portal data flow and the invite lookup), and `docs/design-handoff/README.md` plus its CHANGELOG (trainer portal exceptions: no T1 dashboard, groups, sessions, exports, staff invites, evidence or trainer names). Verify: each unsupported trainer surface named in `WEB-AUDIT.md` is listed.

## 10. Integration

- [ ] 10.1 Ask the owner to stop the Azure container app, then run `turbo typecheck && turbo test && turbo lint` and `next build`. Verify: all pass. Record in a handoff note the changed files, the satisfied spec requirements, and the manual checks from groups 6–8 with their results. Among them:
  - a trainer of two clubs switching clubs
  - an athlete opening `/trainer` and seeing the no-club message
  - another club's URL showing "not a trainer of this club"
