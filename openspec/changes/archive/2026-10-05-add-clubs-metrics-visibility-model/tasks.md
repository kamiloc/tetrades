# Tasks

## 1. Zod contracts (first, per ADR-002)

- [x] 1.1 Add `clubMembershipStatusEnum` and `visibilityAudienceEnum` to `packages/validators/src/enums.ts`; verify enum tests cover the four statuses and three audiences
- [x] 1.2 Add `club.ts`, `club-trainer.ts`, `club-membership.ts`, `metric-definition.ts`, `athlete-metric-entry.ts`, `athlete-metric-summary.ts`, `athlete-visibility-settings.ts` with L0–L3 comments, input schemas (invite, respond, leave, report entry, update visibility, cursor lists), and L2-free output schemas; export via `index.ts`; verify schema unit tests (valid, invalid, no L2 fields in outputs)
- [x] 1.3 Add a pure membership transition table (`ACTIVE`-only access, allowed edges) to `@packages/shared-logic` constants or validators and unit-test every allowed and disallowed edge; verify tests pass

## 2. Prisma schema (stop gate)

- [x] 2.1 Show the user the D1 field table and get approval or edits before touching `schema.prisma`; verify an explicit approval is recorded
- [x] 2.2 Add models, enums, relations, indexes, and `///` classifications to `prisma/schema.prisma`; run `prisma generate` and `prisma validate`; verify both succeed and `__checks__/prisma-zod-bridge.ts` compiles with the new types
- [x] 2.3 STOP: tell the user "Schema modified. Run `prisma migrate dev --name add-clubs-metrics-visibility`"; after they do, verify the generated SQL only creates the new enums and tables

## 3. Database constraints, RLS, and RLS tests

- [x] 3.1 Add `supabase/constraints/club_membership_open_unique.sql` (partial unique index) and `athlete_metric_entry_active_membership.sql` (entry must reference an `ACTIVE` membership of the same athlete); verify via RLS-suite fixtures that violating inserts fail
- [x] 3.2 Add policy files for `clubs`, `club_trainers`, `club_memberships`, `metric_definitions`, `athlete_metric_entries`, `athlete_metric_summaries`, `athlete_visibility_settings` following the AGENTS.md header template; verify each file enables and forces RLS
- [x] 3.3 Write `tests/rls/*.test.ts` for each table: allow, cross-tenant deny with two users, NULL-FK handling; include trainer-cannot-write for `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED`, `REJECTED`, other-club trainer denied, and no update/delete on entries; verify the suite passes
- [x] 3.4 Add an explicit deny-test that a trainer in every membership state cannot read `athlete_private_profiles`; verify it passes against the existing policy unchanged

## 4. Services

- [x] 4.1 Implement `membership` service (invite, respond, leave) with transition table and conditional updates; verify integration tests for every allowed and disallowed transition, double-response race, and duplicate open membership
- [x] 4.2 Implement `visibility` service (viewer relation, `canView`, list `where` builder, default `PRIVATE`); verify unit tests for each audience × relation and the missing-settings case
- [x] 4.3 Implement `metrics` service (`reportEntry` transaction with summary derivation; reads using visibility); verify integration tests for active, pending, completed, rejected, other-club, and summary correctness

## 5. Routers

- [x] 5.1 Ask the user to confirm adding `club`, `metric`, and `visibility` routers; verify an explicit yes
- [x] 5.2 Implement `trainerProcedure` helper and `club` router; merge into `appRouter`; verify integration tests per AGENTS.md (success, invalid input, 401, 404, forbidden for non-trainer and cross-club)
- [x] 5.3 Implement `metric` router with cursor pagination and explicit `select`; verify integration tests including stranger-lists-private-athlete and list/detail parity
- [x] 5.4 Implement `visibility` router (owner-only get/update); verify integration tests including another-user denial
- [x] 5.5 Verify `packages/api-client` types compile with the new `AppRouter` and add typed hooks if the existing pattern requires them

## 6. Data lifecycle (`deletePII`)

- [x] 6.1 Resolve the retention conflict with the user (5-year audit/consent retention vs zero residual rows) and record the decision in design.md before coding; verify the decision is written down
- [x] 6.2 Add `athlete.requestDeletion` (protected; own athlete only; persists a `DELETION` `DataLifecycleRequest`, then enqueues `PII_DELETION` with requestId; extends the existing `athlete` router, adds no router) with Zod schemas first; verify integration tests (success, invalid input, 401, forbidden for another athlete, job enqueued only after the row exists)
- [x] 6.3 Implement the `deletePII` worker: legal-hold abort to `BLOCKED_LEGAL_HOLD`, ordered deletion in transactions across every athlete-FK table (including the new ones), Storage prefix removal, status transitions `REQUESTED → IN_PROGRESS → COMPLETED/FAILED`, logs with requestId; verify an integration test with every table populated ends with zero residual rows
- [x] 6.4 Implement post-deletion verification (every table with an athlete FK plus Storage listing) with `FAILED` and an error log on residue; verify tests for the passing and failing cases
- [x] 6.5 Verify a legal-hold test (nothing deleted, warning logged, request `BLOCKED_LEGAL_HOLD`) and a retry test showing a failed attempt leaves the request in a recoverable state

## 7. Notifications

- [x] 7.1 Get explicit approval for the notification scope: a `DeviceToken` model and migration, a push SDK dependency, and the `CLUB_INVITATION` type (or choose in-app only and skip this group); verify the decision is recorded
- [x] 7.2 Add Zod schemas and the `DeviceToken` model (stop for the user to run the migration), plus its RLS policy and tests (owner-only; cross-tenant denied); verify `tests/rls` passes
- [x] 7.3 Add `registerDeviceToken` / `removeDeviceToken` procedures; verify integration tests (success, invalid input, 401, cross-user denial)
- [x] 7.4 Implement the `sendNotification` worker (resolve tokens server-side, deliver, remove invalid tokens, identifier-only payloads) and enqueue `CLUB_INVITATION` from `club.inviteAthlete` after the membership is persisted; verify delivery failure does not fail the invitation and no personal data is in the payload

## 8. Seed

- [x] 8.1 Add realistic Colombian clubs, trainers, metric definitions, and memberships in all four states plus entries to `prisma/seed.ts`, keeping at least 5 athletes; verify a fresh seed run (user-run) succeeds and RLS tests still pass

## 9. Docs and final gate

- [x] 9.1 Promote the planned ERM annex: move the seven entities into built fragments under `docs/erm/` with full field lists, remove the PLANNED markers, update `docs/erm.mmd` and `docs/erm/README.md`; verify every entity is canonical in exactly one fragment and every edge is present
- [x] 9.2 Update `docs/data-classification.md`, `docs/pii-access-matrix.md`, `docs/testing-strategy.md`, `docs/threat-model.md`, and ADR-013 notes to drop "(planned)"; verify via grep that no "planned" remains for these entities
- [x] 9.3 Run `turbo typecheck && turbo test && turbo lint` and the RLS suite; verify all green and list changed files and exit criteria satisfied
