# Tasks

## 1. Confirmations (AGENTS.md "Explicit confirmation required")

- [x] 1.1 Before any code, STOP and get the user's explicit confirmation for these. Verify: the user's reply is recorded in the session before task 2.1 starts.
  - The new trainer read path: trainers read `PENDING` certification requests made to their club, through the API and the new RLS SELECT policy. This is cross-tenant access to L0 data, scoped by `ClubTrainer`.
  - The new `athlete_achievements` integrity trigger.
  - Removing `achievement.verifyAchievement`.

## 2. Contracts (Zod first)

- [x] 2.1 In `packages/validators/src/enums.ts`, add `certificationRequestStatusEnum` (`PENDING | APPROVED | REJECTED | CANCELLED`). Verify: `enums.test.ts` gains a case that lists the options.
- [x] 2.2 Create `packages/validators/src/achievement-certification.ts`.
  - The base `achievementCertificationRequestSchema` (with an L-level comment on every field, per design D1). Inputs:
    - `requestCertificationInput { achievementId, clubId }`
    - `withdrawCertificationInput { requestId }`
    - `listMyCertificationRequestsInput` (pagination)
    - `listPendingCertificationsInput` (pagination; `clubId` comes from `clubScopedInput`)
    - `decideCertificationInput`, a discriminated union: `APPROVE`, or `REJECT` with `rejectionReason` (1–300 chars, trimmed)
  - Outputs:
    - the athlete's own request rows (club name, status, dates, rejection reason)
    - the trainer's pending rows (request id, achievement title, organization and date, athlete L0 identity)
    - a decision result

  Export everything from the index. Verify: a new `achievement-certification.test.ts` covers that `REJECT` needs a reason, `APPROVE` ignores one, `take` is at most 50, and the trainer row omits rejection reasons and L2 keys (reuse the `collectKeys` L2 check from `clubs-metrics-visibility.test.ts`).
- [x] 2.3 In `packages/validators/src/athlete-achievement.ts`:
  - Add `certifyingClub: z.object({ name: z.string() }).nullable()` to `athleteAchievementPublicOutput`.
  - Delete `verifyAchievementInput`.

  Verify: the validators tests pass, and `grep verifyAchievementInput` finds nothing outside the archive.

## 3. Schema (STOP for the user-run migration)

- [x] 3.1 In `prisma/schema.prisma`:
  - Add `enum CertificationRequestStatus` (`@@map("certification_request_status")`) and `model AchievementCertificationRequest` (`@@map("achievement_certification_requests")`), with every field classified (design D1).
  - Add back-relations on `AthleteAchievement`, `Club`, `ClubMembership` and `ClubTrainer`.
  - Indexes: `(clubId, status, requestedAt)`, `(clubMembershipId, status)`, `(achievementId)`.

  Add a bridge assertion in `apps/api/src/__checks__/prisma-zod-bridge.ts`. Run `prisma generate` and `prisma validate`. Verify: both succeed and `turbo typecheck` passes. Then STOP and tell the user: "Schema modified. Run `prisma migrate dev --create-only --name add_achievement_certification` to create the migration."
- [x] 3.2 Once the user has created the migration, provide the SQL to append:
  - `CREATE UNIQUE INDEX achievement_certification_requests_open_unique ON achievement_certification_requests (achievement_id) WHERE status = 'PENDING';`
  - `UPDATE athlete_achievements SET verification_status = 'UNVERIFIED' WHERE verification_status = 'PENDING';`

  Mirror the index in `supabase/constraints/achievement_certification_open_unique.sql` with the "NOT applied from this file" header. Verify: after the user applies it, `prisma migrate status` is up to date and a read-only query finds zero `PENDING` achievements.

## 4. Database guards

- [x] 4.1 Create `supabase/constraints/achievement_certification_transitions.sql`. It applies to every writer, per design D2, using the pattern from `club_membership_transitions.sql`. Verify: covered by 4.4.
- [x] 4.2 Create `supabase/constraints/achievement_verification_integrity.sql`. It applies only when `auth.role()` is `anon` or `authenticated`, per design D2. Update the comment on `athlete_achievements_update_own` in `supabase/policies/athlete_achievements.sql` to point at the trigger (comment only, no policy change). Verify: covered by 4.4.
- [x] 4.3 Create `supabase/policies/achievement_certification_requests.sql` (ENABLE and FORCE, two SELECT policies, no write policies), with the full header from AGENTS.md: NULL safety, composition, and test file. Verify: covered by 4.4.
- [x] 4.4 Ask the user to apply 4.1–4.3 with `psql -f`, then add the RLS tests:
  - `tests/rls/achievement_certification_requests.test.ts`:
    - The athlete reads their own requests, in every status.
    - A trainer of the club reads only that club's `PENDING` requests.
    - A trainer of another club, and a stranger, read nothing.
    - Inserts and updates by `authenticated` are denied.
    - NULL `decided_by_club_trainer_id` on a `PENDING` row is handled.
    - The service role cannot make invalid transitions or a second `PENDING` request.
  - `tests/rls/athlete_achievements.test.ts`:
    - An owner's INSERT with `VERIFIED` is rejected.
    - An UPDATE of `verification_status` or `verification_source` is rejected.
    - Editing the title of a `VERIFIED` row resets it to `UNVERIFIED`.

  Add the seed helpers to `tests/rls/helpers/setup.ts`. Verify: `turbo test:rls` passes in full.

## 5. Certification service and procedures

- [x] 5.1 Create `apps/api/src/services/certification.ts` with `requestCertification`, `withdrawCertification`, `listMyRequests`, `listPendingForClub` and `decide`, per design D3. Every Prisma query uses `select`, and lists use cursor pagination (`lib/pagination.ts`). Each status change and its achievement summary are written in one transaction. Verify: covered by 5.4.
- [x] 5.2 In `apps/api/src/router/achievement.ts`:
  - Add the five procedures. `listPendingCertifications` and `decideCertification` use `trainerProcedure`; the others use `protectedProcedure`, with `.input()` and `.output()` from validators.
  - Delete `verifyAchievement`.
  - Make `addAchievement` insert `UNVERIFIED`.

  Verify: `turbo typecheck` passes across the API, `api-client` and mobile.
- [x] 5.3 Hooks in `packages/api-client/src/hooks/achievement.ts`: `useRequestCertification`, `useWithdrawCertification`, `useMyCertificationRequests`, `usePendingCertifications(clubId)`, `useDecideCertification`. Remove any `verifyAchievement` hook, and export the new ones from the index. Verify: `turbo typecheck` passes.
- [x] 5.4 New file `apps/api/src/__tests__/integration/certification.int.test.ts`, using the real server, database and auth (`startServer`, `createAuthedUser`, `addClubTrainer`, `createTestMembership`). Verify: the suite passes. It covers:
  - Every procedure: success, invalid input (Zod), 401 and 404.
  - Requesting from a club where the membership is `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED` or `REJECTED`, or where there is none: `FORBIDDEN`, and nothing is stored.
  - Another athlete's achievement: `FORBIDDEN`.
  - An already `VERIFIED` achievement: `BAD_REQUEST`.
  - A second open request: `CONFLICT`.
  - A trainer of club B deciding a request for club A, or listing club A's queue: `FORBIDDEN`.
  - A user who trains no club: `FORBIDDEN`.
  - A decision after the membership became `COMPLETED`: `FORBIDDEN`.
  - Deciding an already-decided request: `BAD_REQUEST`.
  - Approve sets `VERIFIED` and records the trainer and time.
  - Reject with a reason sets `REJECTED`.
  - Withdraw sets `UNVERIFIED`.
  - Re-requesting after a rejection, at another club, keeps the old row.
  - The trainer queue omits decided requests and contains no L2 keys.
  - `listMyCertificationRequests` returns rejection reasons only to the owner.
  - After every flow, the achievement status matches its request history.
- [x] 5.5 Remove or replace the existing `verifyAchievement` tests in `procedures.int.test.ts` and anything else that references it (grep). Add a case to `procedures.int.test.ts` that `addAchievement` returns `UNVERIFIED`. Verify: `grep -rn verifyAchievement apps packages` finds nothing, and the suite passes.

## 6. Leaving a club

- [x] 6.1 In `services/membership.ts`, make `transitionMembership` cancel the membership's `PENDING` certification requests and reset their achievements to `UNVERIFIED` when `to === 'COMPLETED'`, in the same transaction as the guarded status update (design D4). Verify: covered by 6.2.
- [x] 6.2 Extend `membership-service.int.test.ts`. Verify: the suite passes. It covers:
  - Leaving with an open request cancels it and resets the achievement.
  - An `APPROVED` certification from that club stays `VERIFIED` after leaving.
  - Requests to other clubs are untouched.

## 7. Club attribution on reads

- [x] 7.1 In `services/achievements.ts`, select each `VERIFIED` achievement's most recent `APPROVED` request club name. Decide visibility once per call with `resolveAudienceRelation`, `loadAudienceSettings` and `canView('clubMemberships', ...)`. The owner always sees it. Return `certifyingClub: { name } | null` (design D5). Update the header comment. Verify: covered by 7.2.
- [x] 7.2 Extend the `listAchievements` visibility block in `procedures.int.test.ts`. Verify: the suite passes. It covers:
  - Club memberships `PRIVATE`: a stranger gets `VERIFIED` with `certifyingClub: null`.
  - Both `PUBLIC`: an anonymous caller sees the name.
  - Clubs `CONNECTIONS`: a connection sees the name and a stranger doesn't.
  - The owner always sees it.
  - A legacy `VERIFIED` row has a null club.
  - A trainer with a pending request still gets an empty list under `PRIVATE`.
  - List/detail parity: every procedure returning achievement data agrees on `certifyingClub`.

## 8. Notifications

- [x] 8.1 Add `CERTIFICATION_REQUESTED` and `CERTIFICATION_DECIDED` to `NotificationJobData.notificationType` in `packages/queue/src/types.ts`, and generic Spanish copy to `PUSH_COPY` in `services/notifications.ts` (naming no club, athlete, achievement or reason). Verify: `turbo typecheck` passes, and the `notifications.int.test.ts` copy test covers the new types.
- [x] 8.2 After commit, `requestCertification` enqueues one job per trainer account of the club, and `decideCertification` enqueues one job for the athlete. Failures are logged at `warn` with `requestId` and never thrown (the `inviteAthlete` pattern). Verify: `certification.int.test.ts`, using a recording and a failing `JobEnqueuer`, shows that the payload keys are exactly `notificationType`, `requestId`, `subjectId` and `userAccountId`, and that a failing enqueue still stores the request or decision.

## 9. Data lifecycle

- [x] 9.1 In `services/dataLifecycle.ts`, delete the athlete's certification requests in `deleteAthleteRows` before the achievements, and count them in `verifyDeletion` (design D8). Verify: `data-lifecycle.int.test.ts` populates a request for the deleted athlete and still completes with zero residue.

## 10. Seed

- [x] 10.1 In `prisma/seed.ts`, seed realistic Colombian certification requests in every state, using existing clubs, trainers and `ACTIVE` memberships:
  - an approved certification (its achievement `VERIFIED`);
  - a rejection with a reason;
  - a pending request;
  - a cancelled request.

  Insert `PENDING` first, then move it, so the transitions trigger accepts it. Leave the other seeded achievements `UNVERIFIED`. Verify: `yarn db:seed` completes, and a read-only count shows each status present.

## 11. Documentation

- [x] 11.1 ADR and policy docs. Verify: each document names the certification flow, and the ADR README lists ADR-016.
  - Add `docs/adr/016-achievement-certification-by-club-trainers.md`. It partially supersedes ADR-014's "Trainers get no extra access through club membership", only for pending requests made to their club. List it in `docs/adr/README.md`.
  - Update `docs/pii-access-matrix.md`: achievement rows for trainers, and a new certification-requests section.
  - Update `docs/threat-model.md`: a self-verification risk and its mitigation.
- [x] 11.2 Architecture and data docs. Verify: each document names the certification flow.
  - Update `docs/data-classification.md`: the new table's levels.
  - Update `docs/erm/` (new entity, canonical in `athlete-profile-core.mmd` or a new `achievement-certification.mmd`, plus the README row) and `docs/erm.mmd`.
  - Update `docs/project-architecture.md`: a "Trainer certification" data flow.
  - Mark the Change 7 achievement-verification point done in `docs/SPRINT_PLAN_v1.md`.

## 12. Integration check

- [x] 12.1 Rebuild the packages (`turbo build --filter='./packages/*'`), then run `turbo typecheck && turbo test && turbo test:rls && turbo lint`. Verify: everything passes, apart from known, documented flakes, each reported with its output.
