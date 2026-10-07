# Tasks

## 1. Contracts (Zod first)

- [x] 1.1 In `packages/validators/src/athlete-visibility-settings.ts`, add `achievementsAudience: visibilityAudienceEnum` (`/// L1-INTERNAL`) to `athleteVisibilitySettingsSchema`. Include it in the `updateAthleteVisibilityInput` pick and in its "at least one setting" refine, and in the `athleteVisibilitySettingsOwnerOutput` pick. Verify: `clubs-metrics-visibility.test.ts` gains cases. `{ achievementsAudience: 'PRIVATE' }` alone is a valid update, `'FRIENDS'` is rejected, and `{}` is still rejected.
- [x] 1.2 In `packages/validators/src/athlete-achievement.ts`, add `athleteAchievementPublicListOutput = z.array(athleteAchievementPublicOutput)` with its inferred type, and export it from the package index. Verify: a validators test parses a public row and strips `createdAt`, `verificationSource`, and `athleteId` from an over-wide object. `turbo test --filter=@packages/validators` passes.

## 2. Schema (STOP for the user-run migration)

- [x] 2.1 In `prisma/schema.prisma`, add `achievementsAudience VisibilityAudience @default(PUBLIC) @map("achievements_audience")` with `/// L1-INTERNAL` to `AthleteVisibilitySettings`. Run `prisma generate` and `prisma validate`. Verify: both succeed, and `apps/api/src/__checks__/prisma-zod-bridge.ts` typechecks. Then STOP and tell the user: "Schema modified. Run `prisma migrate dev --name add_achievements_audience` to create the migration."
- [x] 2.2 After the user runs the migration, confirm it with `prisma migrate status`. Verify: it reports the schema up to date, and the new migration file contains `ADD COLUMN "achievements_audience" ... NOT NULL DEFAULT 'PUBLIC'`.

## 3. Visibility service

- [x] 3.1 In `apps/api/src/services/visibility.ts`:
  - Add `'achievements'` to `VisibilityCategory`.
  - Add `achievementsAudience` to `AudienceSettings`, `AUDIENCE_FIELD`, and the `loadAudienceSettings` select.
  - Replace `DEFAULT_AUDIENCE` with `CATEGORY_DEFAULT_AUDIENCE` (achievements `PUBLIC`, others `PRIVATE`).
  - Make `audienceFor` and `audienceWhere` attach the missing-row case to the category's default.

  Update the header comment. Verify: `turbo typecheck` passes, and no references to `DEFAULT_AUDIENCE` remain (grep).
- [x] 3.2 Make `getOwnSettings` and `updateOwnSettings` select and return `achievementsAudience`, with defaults taken from `CATEGORY_DEFAULT_AUDIENCE` when there is no row. Verify: as below in 3.3.
- [x] 3.3 Extend `apps/api/src/__tests__/visibility.test.ts`:
  - The category × audience × relation matrix includes `achievements`.
  - The missing-row cases are per category (achievements visible to strangers, the others hidden).
  - `visibleAthleteWhere('achievements', null)` attaches the missing-row branch to `PUBLIC`.

  Verify: the API unit tests pass.

## 4. Achievement read path

- [x] 4.1 Create `apps/api/src/services/achievements.ts` with `listAchievements(prisma, viewer, athleteId)`, per design D3:
  - unknown athlete → `NOT_FOUND`
  - owner → all rows
  - otherwise one query over `VERIFIED` rows filtered by `visibleAthleteWhere('achievements', viewer)`

  It selects only the public fields, ordered by `achievedOn desc`. Verify: as below in 4.3.
- [x] 4.2 In `apps/api/src/router/achievement.ts`, change `listAchievements` to `publicProcedure`, with `.output(athleteAchievementPublicListOutput)` and an implementation that calls the service with `resolveViewer(ctx.prisma, ctx.userId)`. Verify: `turbo typecheck` passes across `apps/mobile` and `@packages/api-client` (both consume the narrowed output).
- [x] 4.3 Rewrite the `listAchievements visibility` block in `apps/api/src/__tests__/integration/procedures.int.test.ts`. It needs these cases:
  - owner sees all statuses under `PRIVATE`
  - stranger, connection, and anonymous callers under each audience
  - `PENDING` is never shown to non-owners under `PUBLIC`
  - no settings row → strangers and anonymous callers see `VERIFIED`
  - an `ACTIVE`-club trainer sees nothing under `PRIVATE`
  - unknown athlete → `NOT_FOUND`
  - invalid input (non-cuid `athleteId`) → `BAD_REQUEST`
  - returned objects have no `createdAt`, `verificationSource`, or `athleteId`

  Verify: the API integration suite passes.
- [x] 4.4 Add an achievements list/detail parity test to `clubs-metrics-visibility.int.test.ts`. For every audience × caller, `listAchievements` returns achievements exactly when `canView('achievements', …)` admits the caller. Verify: the test passes. The existing metric parity tests stay green.

## 5. Visibility router behavior

- [x] 5.1 Extend the visibility procedure tests in `clubs-metrics-visibility.int.test.ts` with these cases:
  - `visibility.get` on a fresh athlete returns `achievementsAudience: 'PUBLIC'` while the other categories are `PRIVATE`.
  - `visibility.update({ achievementsAudience: 'PRIVATE' })` persists and leaves the other categories unchanged.
  - Another user cannot affect the owner's achievements setting.

  Verify: the tests pass.
- [x] 5.2 Update the comment in `packages/api-client/src/hooks/visibility.ts` ("PRIVATE defaults when unset") to describe the per-category defaults. Verify: `turbo lint` passes.

## 6. RLS (needs explicit user confirmation before applying)

- [x] 6.1 Ask the user to confirm narrowing the `athlete_achievements` SELECT policy. Then, in `supabase/policies/athlete_achievements.sql`:
  - Replace `athlete_achievements_select_authenticated` with `athlete_achievements_select_own`, using the owner `EXISTS` predicate.
  - Write the full header: purpose, NULL safety, "ONLY SELECT policy".
  - Update the file's trust-model comment (audience filtering lives in the API visibility service; this narrows the old note that public pages bypass RLS).
  - Add `DROP POLICY IF EXISTS` for the old name.

  Verify: the file applies cleanly with `psql $DATABASE_URL -f supabase/policies/athlete_achievements.sql` (the user runs it, or it runs with their approval).
- [x] 6.2 In `tests/rls/athlete_achievements.test.ts`:
  - Replace the "any authenticated user can SELECT (USING TRUE)" case with owner-can-SELECT and a cross-tenant deny using two distinct users.
  - Add a case showing an `ACTIVE`-club trainer cannot SELECT.
  - Add a NULL-safety case (insert with NULL `athlete_id` is rejected).

  Verify: the full `tests/rls/` suite passes, not just this file.
- [x] 6.3 In `tests/rls/athlete_visibility_settings.test.ts`, add the column-default check: the owner's inserted row reads `achievements_audience = 'PUBLIC'` when it is omitted. Verify: the full `tests/rls/` suite passes.

## 7. Seed and docs

- [x] 7.1 In `prisma/seed-data/clubs-metrics.ts` and `prisma/seed.ts`, give the visibility seed rows an `achievementsAudience`. Cover all three values across athletes, and leave at least one athlete without a settings row so the `PUBLIC` default stays exercised. Verify: `prisma db seed` runs cleanly against the test database (with user approval).
- [x] 7.2 Write `docs/adr/014-achievement-visibility-default.md`, superseding ADR-013 §7's default clause for achievements only. List it in `docs/adr/README.md` and mark ADR-013 as partially superseded. Verify: the ADR has Status, Context, Decision, and Consequences sections, and the README index links it.
- [x] 7.3 Update the docs:
  - `docs/pii-access-matrix.md`: add an achievements section covering owner, connection, stranger, public visitor, trainer, and API server rows.
  - `docs/erm/visibility.mmd`: add the `achievements_audience` column.
  - `docs/data-classification.md`: if it enumerates visibility categories, add achievements.

  Verify: grep shows `achievementsAudience` / `achievements_audience` in each updated file, and nothing contradicts the PUBLIC default.

## 8. Integration check

- [x] 8.1 Run `turbo typecheck && turbo test && turbo lint` and the full `tests/rls/` suite. Verify: everything is green, or any failure is reported with output. In particular, `rate-limit.int.test.ts` is known to be timing-flaky against the remote DB; rerun it in isolation before treating it as a regression.
- [x] 8.2 Run `openspec validate add-achievement-visibility --strict`, list all changed files, and note the follow-up (paginate `listAchievements` in Change 9). Verify: validation passes.
