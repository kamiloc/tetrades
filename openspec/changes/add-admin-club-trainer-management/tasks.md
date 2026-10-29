# Tasks

## 1. Confirmations (AGENTS.md "Explicit confirmation required")

- [ ] 1.1 Before any code, STOP and get the owner's explicit confirmation for each item below. Verify: the owner's reply is recorded in the session before task 2.1 starts.
  - New routers `admin` and `trainerInvitation`, merged in `router/index.ts` (design D4, D9).
  - RLS and grant changes:
    - narrowed trainer subqueries in `club_memberships.sql`, `athlete_metric_entries.sql` and `achievement_certification_requests.sql`
    - column-level SELECT grants on `clubs`
    - the `club_is_active()` `SECURITY DEFINER` helper
    - new policy files `club_trainer_invitations.sql` and `admin_action_log.sql` (design D6)
  - Triggers: invitation transitions, the extended metric-entry trigger, and `account_single_capacity.sql` (design D3, D6, D12).
  - New raw-SQL lock helpers `lockActiveClub` and `lockActiveTrainer` (`$queryRaw`, design D7).
  - Changes to `middleware/auth.ts`, `context.ts` and `@packages/auth` `verifyAccessToken` to carry only a confirmed email (design D2).
  - The new recurring job `trainer-invitation-redaction` and its scheduler (design D13).
  - Test-helper changes that make trainers separate accounts (design D12). No test file is deleted.
  - The schema changes in group 3. The owner runs the migration.

## 2. Contracts (Zod first)

- [ ] 2.1 In `packages/validators/src/enums.ts`:
  - add `ADMIN` to `userRoleEnum`
  - add `trainerInvitationStatusEnum` and `trainerInvitationStateEnum` (adds `EXPIRED`)
  - add `adminActionEnum` (design D8)

  Verify: `enums.test.ts` lists the options of each.
- [ ] 2.2 In `club.ts`:
  - add `deactivatedAt` (L1) to `clubSchema`
  - make `clubPublicOutput` omit `deactivatedAt` and `createdAt` and add `isActive` (L0)
  - add `createClubInput`, `updateClubInput` (`.strict()`, no `slug`), `adminClubIdInput` and `listAdminClubsInput`
  - add `adminClubOutput` (timestamps and `activeTrainerCount`), `adminClubListOutput` and `deactivateClubOutput` (cancelled counts)

  Verify: a new `club-administration.test.ts` covers that `updateClubInput` rejects `slug`, `take` is at most 50, and `clubPublicOutput` has `isActive` but neither timestamp.
- [ ] 2.3 In `club-trainer.ts`, add `revokedAt` (L1). Create `club-trainer-invitation.ts`:
  - the base schema (design D3, a level comment on every field)
  - `inviteTrainerInput` (email trimmed, lowercased, max 254)
  - `trainerInvitationIdInput`
  - `listClubTrainersInput` and `listClubTrainerInvitationsInput`
  - the admin trainer row (with `invitedEmail` nullable) and the admin invitation row (derived `state`)
  - `inviteTrainerOutput` (with `expiresAt`)
  - the invitee row (club L0 fields, `expiresAt`)
  - mutation outputs

  Verify: tests cover email normalization, an invalid email being rejected, and that no output contains L2 keys or `supabaseUserId` (reuse the `collectKeys` check).
- [ ] 2.4 Create `admin-action-log.ts` with the base schema and the metadata type (ids, counts and field names only). Export everything new from `index.ts`. Verify: `yarn turbo run build --filter=@packages/validators` passes.
- [ ] 2.5 Add a pure `trainerInvitationState(status, expiresAt, now)` helper to `@packages/shared-logic`. Verify: Vitest covers `PENDING` before and at expiry, plus each terminal status.
- [ ] 2.6 In `@packages/queue`:
  - add `CLUB_INVITATION_CLOSED` to `NotificationType`
  - add the `TRAINER_INVITATION_REDACTION` queue name and its `{ requestId }` payload type, registered with the default retries and backoff

  Verify: `yarn turbo run build --filter=@packages/queue` passes, and the payload type has no non-serializable fields.

## 3. Schema (stop for the owner)

- [ ] 3.1 Update `prisma/schema.prisma`, with a `///` level comment on every new field:
  - `UserRole.ADMIN`
  - `Club.deactivatedAt`
  - `ClubTrainer.revokedAt`
  - enum `TrainerInvitationStatus` and model `ClubTrainerInvitation` (FKs `Restrict`, `redactedAt`, `@@index([clubId, status])`, `@@index([email, status])`)
  - enum `AdminAction` and model `AdminActionLog` (`@@index([actorUserAccountId, createdAt])`, `@@index([targetType, targetId])`)

  Verify: `prisma validate` and `prisma generate` succeed, and the Prisma/Zod compatibility check in `apps/api/src/__checks__` passes.
- [ ] 3.2 STOP and tell the owner: "Schema modified. Run `prisma migrate dev --name add_admin_club_trainer_management` to create the migration." Ask them to hand-edit in `CHECK (email = lower(email))` and `CREATE UNIQUE INDEX ... ON club_trainer_invitations (club_id, lower(email)) WHERE status = 'PENDING'`, mirrored in `supabase/constraints/club_trainer_invitation_open_unique.sql`. Verify: the owner confirms the migration is applied before group 4 starts.

## 4. Database constraints, grants and RLS

- [ ] 4.1 Create `supabase/constraints/club_trainer_invitation_transitions.sql` (design D3). Verify: a new `tests/rls/club_trainer_invitations.test.ts` block, using service-role writes, proves:
  - inserts must be `PENDING`
  - the three allowed transitions succeed
  - transitions out of terminal states raise
  - edits to `club_id` and `invited_by_user_account_id` raise
  - the only allowed email change is the redaction marker with `redacted_at`
- [ ] 4.2 In the same test file, prove the uniqueness guarantee at the database level. Verify:
  - a service-role insert of `Ana@Club.co` fails the CHECK
  - a second `PENDING` row for the same club and email fails the unique index
  - a `PENDING` row for the same email at another club succeeds
- [ ] 4.3 Create `supabase/policies/club_trainer_invitations.sql` (ENABLE + FORCE, full header with the D2 trust assumption, no client policies, `REVOKE ALL` from `anon` and `authenticated`). Verify: tests prove the invitee (confirmed email) and a second user both read zero rows directly, and client INSERT, UPDATE and DELETE are denied.
- [ ] 4.4 Create `supabase/policies/admin_action_log.sql` (ENABLE + FORCE, no client policies, `REVOKE ALL` from client roles). Run `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user` on the `DATABASE_URL` connection and record the result in the header. Verify: a new `tests/rls/admin_action_log.test.ts` proves an admin and an athlete each read zero rows and every client write is denied. If `rolbypassrls` is false, STOP and report it, because the API's write path would then need a policy decision.
- [ ] 4.5 Add `public.club_is_active(text)` (`STABLE SECURITY DEFINER`, pinned `search_path`) and the column grants to `clubs.sql`. Update the headers in `clubs.sql` and `club_trainers.sql`. Verify: `tests/rls/clubs.test.ts` proves an anonymous client can select `id, slug, name, country_code, city` and gets a permission error selecting `deactivated_at` or `created_at`. Any existing `select('*')` on `clubs` in `tests/rls/` is changed to explicit columns.
- [ ] 4.6 In `club_memberships.sql`, `athlete_metric_entries.sql` and `achievement_certification_requests.sql`, add `ct.revoked_at IS NULL AND public.club_is_active(ct.club_id)` to every `club_trainers` subquery, and update the headers. Verify: each table's test file gains deny cases for a revoked trainer and for a trainer of a deactivated club, alongside the existing cross-tenant and NULL tests.
- [ ] 4.7 Extend `athlete_metric_entry_active_membership.sql` to reject entries from a revoked trainer or a deactivated club. Verify: `tests/rls/athlete_metric_entries.test.ts` covers both cases with service-role inserts.
- [ ] 4.8 Create `supabase/constraints/account_single_capacity.sql` (design D12), and switch both test helpers' `addClubTrainer` to a dedicated trainer-only account (`createTrainerUser` in `tests/rls/helpers/setup.ts`). Verify:
  - new tests prove a service-role insert of a `club_trainers` row for an athlete account or an `ADMIN` account fails, and that inserting an `athletes` row for an account with a trainer row fails
  - run the full `yarn turbo run test:rls` and confirm it passes

## 5. API: identity, admin check, one capacity and trainer access

- [ ] 5.1 In `@packages/auth`, make `verifyAccessToken` return `email` only when `email_confirmed_at` is set. Carry it through `middleware/auth.ts` (`AuthResult.email`) and `context.ts` (`userEmail`, lowercased). Verify:
  - `packages/auth` tests cover confirmed → email and unconfirmed → `null`
  - an API auth test proves `userEmail` is `null` without a session and never appears in error output
- [ ] 5.2 Add `adminProcedure` to `trpc.ts` (uncached role lookup, `ctx.admin`) and add `ADMIN` to `ADMIN_ROLES`. Verify:
  - integration tests: `ADMIN` passes; `ATHLETE`, `SYSTEM` and a trainer account get `FORBIDDEN`; no session gets `UNAUTHORIZED`
  - changing the role in the database is enforced on the next call
  - `rate-limit.test.ts` covers the `ADMIN` tier
- [ ] 5.3 Make `athlete.bootstrap` reject non-`ATHLETE` roles and accounts with any `ClubTrainer` row (design D12). Verify: integration tests prove an `ADMIN` account and a revoked-trainer account each get `FORBIDDEN` and no athlete row is created.
- [ ] 5.4 Update `requireClubTrainer` (one `FORBIDDEN` message for missing, revoked, or deactivated club) and add `revokedAt: null` to the certification-notification trainer query. Verify:
  - integration tests run every trainer procedure (`inviteAthlete`, `listRoster`, `reportEntry`, `listPendingCertifications`, `decideCertification`) as a revoked trainer and as a trainer of a deactivated club, and get `FORBIDDEN` each time
  - a revoked trainer gets no certification-request notification job
- [ ] 5.5 Add `lockActiveClub` and `lockActiveTrainer` (design D7). Call them first in `inviteAthlete`, `reportEntry` and `decideCertification`, and call `lockActiveClub` in `requestCertification`. Update the lock-order comment in the `services/certification.ts` header. Verify with the two-connection pattern from the existing certification concurrency test:
  - `requestCertification` racing `deactivateClub` ends with the request `CANCELLED` or never created
  - `reportEntry` racing `revokeTrainer` ends with the entry either committed before the revocation or rejected `FORBIDDEN`
  - `decideCertification` racing `revokeTrainer` ends with the request either decided before the revocation or still `PENDING`
- [ ] 5.6 Map club timestamps to `isActive` in every service that outputs a club (memberships, certification rows, certifying club). Verify: `turbo typecheck` passes, and an integration test proves `club.listMyMemberships` returns `isActive: false` for a deactivated club.

## 6. API: admin router, trainer invitations, notifications

- [ ] 6.1 Implement `services/adminClubs.ts` (create, update, list, get, deactivate with the cascade in lock order, reactivate). Each writes an `AdminActionLog` row in the same transaction. Deactivation enqueues `CLUB_INVITATION_CLOSED` jobs after commit. Verify: integration tests cover every `club-administration` scenario:
  - slug conflict → `CONFLICT`; unknown club → `NOT_FOUND`; deactivating twice or reactivating an active club → `BAD_REQUEST`
  - the full cascade, with `ACTIVE` memberships and `VERIFIED` achievements unchanged
  - cancelled items stay cancelled after reactivation
  - log rows only for successful writes, with no email in `metadata`
  - one notification job per closed invitation (ids only)
  - deactivation succeeding when enqueue fails
- [ ] 6.2 Add `CLUB_INVITATION_CLOSED` copy to `PUSH_COPY` in `services/notifications.ts`. Verify: the notifications unit test asserts the copy names no club and the worker sends it.
- [ ] 6.3 Implement `services/trainerInvitations.ts`:
  - admin: invite (close an expired pending row first), revoke invitation, revoke trainer (lock order per D7), trainer and invitation lists with `invitedEmail`
  - invitee: `listMine`, `accept`, `decline` (design D4)

  Verify: integration tests cover every `trainer-provisioning` scenario:
  - case-insensitive duplicate and already-a-trainer → `CONFLICT`
  - expired accept rejected; re-invite after expiry works
  - another user's email, or an unconfirmed email → `NOT_FOUND` or an empty list
  - athlete or `ADMIN` account accepting → `FORBIDDEN`, invitation still `PENDING`
  - accepting grants trainer access; return after revocation clears `revokedAt`
  - accepting for a club deactivated meanwhile is rejected
  - `invitedEmail` shows the original address
- [ ] 6.4 Create `router/admin.ts` (`whoAmI` plus the D9 procedures) and `router/trainerInvitation.ts`, and merge both in `router/index.ts`. Verify: each procedure has success, Zod-invalid, 401, and 404 (where it takes an id) integration coverage, and `admin.updateClub` with a `slug` key is `BAD_REQUEST`.
- [ ] 6.5 Add typed hooks to `@packages/api-client` (`admin.*`, `trainerInvitation.*`, with invalidation on mutations). Verify: `turbo typecheck` passes for `@packages/api-client`, `@app/web` and `@app/mobile`.

## 7. Retention and deletion

- [ ] 7.1 Implement `apps/api/src/jobs/redactTrainerInvitations.ts` (design D13: set-based updates per category, counts logged with `requestId`) and register a daily `upsertJobScheduler` at API startup. Verify: integration tests prove:
  - a declined invitation 91 days old is redacted and one 89 days old is not
  - an expired `PENDING` invitation past 90 days is redacted
  - an `ACCEPTED` invitation is kept while its trainer is active and redacted 91 days after revocation
  - re-running changes nothing
- [ ] 7.2 Extend `services/dataLifecycle.ts` (design D14): read the confirmed email before deleting the auth user; revoke and redact invitations with that email in the deletion transaction; add the invitation count to `verifyDeletion`. Verify: `data-lifecycle.int.test.ts` proves a pending invitation to the deleted athlete's email ends `REVOKED` and redacted, and that verification reports residue (and the request ends `FAILED`) when such a row is planted after deletion. No email appears in logs.

## 8. Mobile

- [ ] 8.1 Show the "Inactive club" chip in `apps/mobile/app/(app)/(tabs)/clubs.tsx` for memberships whose `club.isActive` is false, keeping Leave (design D10). Verify: a component or shared-logic test, or a manual check with a deactivated seeded club, shows the chip with Leave still working.
- [ ] 8.2 Show the trainer-account message in onboarding when `athlete.bootstrap` returns `FORBIDDEN` for a trainer account (design D10). Add both copies to `docs/design-handoff/README.md` and the CHANGELOG. Verify: a manual check with a seeded trainer account shows the message and creates no athlete.

## 9. Docs

- [ ] 9.1 Write `docs/adr/017-platform-admin-trainer-provisioning-and-club-lifecycle.md` (design D15), including the trainer-deletion known gap and its manual procedure. Update `docs/adr/README.md`. Verify: the ADR links ADR-013, ADR-014 and ADR-016, and the README marks ADR-013 §5 as amended.
- [ ] 9.2 Update `docs/pii-access-matrix.md`, `docs/threat-model.md`, `docs/data-classification.md`, `docs/project-architecture.md` and the AGENTS.md Habeas Data checklist. Change the "provisioned out-of-band" comments in `club.ts`, `club-trainer.ts` and `router/club.ts`. Verify: each doc names ADR-017, and `grep -rn "out-of-band" apps/api/src packages/validators/src` returns only role provisioning.

## 10. Seed and integration

- [ ] 10.1 Extend `prisma/seed.ts` or `prisma/dev-fixtures/clubs.ts`. Add:
  - one `ADMIN` account (marked dev-only)
  - a deactivated Colombian club
  - a revoked trainer
  - pending and expired trainer invitations

  All trainer accounts stay trainer-only. Use realistic Colombian names and no prototype records. Verify: `yarn db:seed` and the fixture run cleanly against a fresh database with `account_single_capacity.sql` applied.
- [ ] 10.2 Run `turbo typecheck && turbo test && turbo lint` and the full `turbo test:rls`. Verify: all pass. List the changed files and the satisfied spec requirements in the handoff note, and note that the web UI ships in `add-web-portal-shell`.
