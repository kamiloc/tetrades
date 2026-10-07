# Proposal

## Why

Athletes control who sees their club memberships and metrics, but not their achievements. Today any signed-in user can read any athlete's VERIFIED achievements, through `achievement.listAchievements` and through a `USING (TRUE)` RLS policy. Cristian decided on 2026-10-05 that achievements must be visibility-editable. Public-profile fields keep their current behavior. The public web profile (Change 9) also needs an anonymous, visibility-filtered read of achievements, which does not exist today.

## What Changes

- Add an achievements category to `AthleteVisibilitySettings` (`achievementsAudience`, audiences `PRIVATE` / `CONNECTIONS` / `PUBLIC`). The athlete reads and changes it through the existing `visibility.get` / `visibility.update`.
- **Default `PUBLIC` for achievements.** This applies both when an athlete has no settings row and as the column default for existing rows. Everything stays visible exactly as today until the athlete restricts it. Clubs and metrics keep their `PRIVATE` default. This departs from ADR-013 §7 ("a missing row resolves to the most restrictive setting"), so it is recorded in a new ADR that supersedes that clause for achievements only.
- Filter every achievement read through the visibility service:
  - Non-owners see only `VERIFIED` achievements, and only when the athlete's achievements audience admits them.
  - The owner always sees all of their achievements.
- **BREAKING (API):** `achievement.listAchievements` changes in two ways:
  - It becomes a `publicProcedure`, so anonymous callers get `PUBLIC`-audience achievements.
  - Its output narrows to the public achievement shape (`id`, `title`, `organization`, `achievedOn`, `verificationStatus`). This drops `athleteId`, `verificationSource` and `createdAt` (L1). Nothing in the repo reads the dropped fields.
- Narrow the RLS SELECT policy on `athlete_achievements` from "any authenticated user" to the owning athlete only. Audience filtering stays in the API, matching how `club_memberships` and `athlete_metric_entries` work.
- Not in scope:
  - visibility for public-profile fields (Cristian: keep current behavior)
  - a mobile or web settings screen (no visibility UI exists yet; that belongs to Changes 8 and 9)
  - pagination of `listAchievements` (see design)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `athlete-visibility`:
  - Settings gain an achievements category.
  - The "missing settings means most restrictive" rule becomes a per-category default: `PUBLIC` for achievements, `PRIVATE` for clubs and metrics.
  - List/detail parity and owner access extend to achievements.
  - A new requirement governs who may read achievements, and which ones.

## Impact

- **Schema (user-run migration):**
  - `athlete_visibility_settings.achievements_audience` (`visibility_audience`, `NOT NULL DEFAULT 'PUBLIC'`, L1-INTERNAL).
  - Zod changes first: `athleteVisibilitySettingsSchema`, `updateAthleteVisibilityInput`, `athleteVisibilitySettingsOwnerOutput`, and a public achievement list output.
- **API:**
  - `services/visibility.ts` gets a new category and per-category defaults.
  - `router/achievement.ts`: `listAchievements` moves to `publicProcedure`, its output narrows, and its business logic moves to a new `services/achievements.ts`.
  - `visibility` router behavior changes through the service only.
- **RLS:** `supabase/policies/athlete_achievements.sql` narrows its SELECT policy. This needs explicit confirmation at apply time, and the full `tests/rls/` suite must run.
- **Tests:**
  - visibility unit tests
  - `procedures.int.test.ts` achievement cases
  - a list/detail parity integration test for achievements
  - `tests/rls/athlete_achievements.test.ts` (the `USING TRUE` case flips to a deny-test)
  - `tests/rls/athlete_visibility_settings.test.ts` default checks
  - validators tests
- **Clients:** `@packages/api-client` needs no code change; its visibility hook comment gets updated. The mobile screens read only fields kept in the public shape. However, `apps/mobile/app/(app)/achievements.tsx` annotated its list with the full `AthleteAchievement` type, so that annotation changes to `AthleteAchievementPublicOutput`. This is type-only, with no behavior change (found while applying task 4.2).
- **Seed:** `prisma/seed-data/clubs-metrics.ts` visibility rows gain an achievements audience covering all three values.
- **Docs:**
  - new ADR (achievement visibility default)
  - `docs/pii-access-matrix.md`
  - `docs/erm/visibility.mmd`
  - `docs/data-classification.md`, if it lists visibility categories
- **Data lifecycle:** no change. `deletePII` already removes the settings row and achievements.
