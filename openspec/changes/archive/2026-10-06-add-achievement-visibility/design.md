# Design

## Context

See proposal.md (Why). Current state that shapes the approach:

- `services/visibility.ts` is the single visibility mechanism. It holds two forms of the same rule, both derived from `AUDIENCE_RELATIONS`:
  - `canView()`: a pure check for one athlete.
  - `visibleAthleteWhere()`: a Prisma filter for lists.

  Both assume one global `DEFAULT_AUDIENCE = 'PRIVATE'`. The filter also treats a missing settings row as matching only the `PRIVATE` branch.
- `AthleteVisibilitySettings` has two columns, `clubMembershipsAudience` and `metricsAudience`, both `NOT NULL DEFAULT PRIVATE`. RLS is owner-only.
- `achievement.listAchievements` is the only achievement read path; `deletePII` only deletes and counts. Today it works like this:
  - It is a `protectedProcedure` with inline logic.
  - Non-owners get `VERIFIED` rows and owners get all rows.
  - It returns the full row, including `createdAt` (L1).
- RLS `athlete_achievements_select_authenticated` is `USING (TRUE)` for `authenticated`.
- Established pattern for `club_memberships` and `athlete_metric_entries`: RLS grants only the parties to the row, and audience filtering runs in the API service. Prisma connects with a role that bypasses RLS.
- Mobile reads `id`, `title`, `organization`, `achievedOn`, and `verificationStatus` from `listAchievements`, and nothing else.

## Goals / Non-Goals

**Goals:**

- Achievements become a third visibility category that uses the same rule and the same code path as clubs and metrics.
- Each category has its own default, and the default is defined once.
- Nothing changes for any existing viewer until an athlete changes the new setting.

**Non-Goals:**

- Paginating `listAchievements`. The output stays a bare array; see Risks.
- Any client UI for the setting.
- Hiding achievements on profile search results. `searchAthletes` returns no achievements.

## Decisions

### D1. Per-category defaults replace the global `DEFAULT_AUDIENCE`

- `DEFAULT_AUDIENCE` is replaced by `CATEGORY_DEFAULT_AUDIENCE: Record<VisibilityCategory, VisibilityAudience>` = `{ clubMemberships: 'PRIVATE', metrics: 'PRIVATE', achievements: 'PUBLIC' }`.
- `audienceFor`, `audienceWhere` (the missing-row branch attaches to the category's default audience rather than to `PRIVATE`), and `getOwnSettings` (the defaults when there is no row) all read from this map.
- The Prisma column default for `achievementsAudience` is `PUBLIC`, so a stored row and a missing row mean the same thing.

*Alternative considered:* default `PRIVATE` everywhere and backfill `PUBLIC` for existing athletes. Rejected because a new athlete would then get a different default from an existing one, and Cristian chose `PUBLIC` as the default.

### D2. Schema: one new column, `NOT NULL DEFAULT 'PUBLIC'`

- `achievementsAudience VisibilityAudience @default(PUBLIC) @map("achievements_audience")`, documented as `/// L1-INTERNAL`.
- Postgres fills a constant default on `ADD COLUMN` without rewriting the table, and existing rows read as `PUBLIC`. No backfill script is needed.
- Zod changes first, per the contract chain:
  - `athleteVisibilitySettingsSchema` gains the field.
  - `updateAthleteVisibilityInput` picks it, and its "at least one setting" refine includes it.
  - `athleteVisibilitySettingsOwnerOutput` picks it.

### D3. Achievement reads move to `services/achievements.ts` and use the database form of the rule

`listAchievements(prisma, viewer, athleteId)` works like this:

1. Confirm the athlete exists, otherwise `NOT_FOUND`.
2. If `viewer?.athleteId === athleteId`, return every achievement.
3. Otherwise run one query with `where: { athleteId, verificationStatus: 'VERIFIED', athlete: visibleAthleteWhere('achievements', viewer) }`.

This is the same filter form `metricEntryVisibilityWhere` uses. Future lists of achievements, such as a feed or the public web profile, get the rule by reusing the filter rather than re-deriving it.

The router becomes `publicProcedure`, which resolves the viewer with `resolveViewer(ctx.prisma, ctx.userId)` (null for anonymous callers), exactly like `metric.listEntries`.

- *Owner branch is explicit:* `visibleAthleteWhere` already admits the owner. However, the owner must also see non-`VERIFIED` rows, which the shared filter cannot express, so the owner case short-circuits before the filter.
- *Trainers:* `visibleAthleteWhere` has no trainer branch, so trainers of an `ACTIVE` club get no extra access. That is the specified behavior (unlike metric entries).
- *Alternative considered:* `loadAudienceSettings` + `resolveAudienceRelation` + `canView`, which takes three queries. Rejected because it is slower, and it is the per-athlete form that list paths must not drift from.

### D4. One public output shape for every caller

- `listAchievements` outputs `athleteAchievementPublicListOutput = z.array(athleteAchievementPublicOutput)` for every caller, the owner included.
- That shape is `id`, `title`, `organization`, `achievedOn`, `verificationStatus`. It has no L1 fields and no internal ids, so returning it to anonymous callers is safe.
- *Alternatives considered:*
  - An owner/non-owner union output. Rejected because clients would have to narrow it, and nothing uses the extra fields.
  - A separate owner procedure. Rejected because it adds a procedure (which needs confirmation) for no current consumer.
- If a later screen needs `verificationSource`, add an owner-only procedure then.

### D5. RLS: narrow SELECT to the owner; audience stays in the API

- Replace `athlete_achievements_select_authenticated` (`USING (TRUE)`) with `athlete_achievements_select_own`, which uses the same owner `EXISTS` predicate as the file's INSERT, UPDATE, and DELETE policies.
- After this, it is the only SELECT policy.
- ADR-013 §7 requires RLS to encode visibility "where a table is directly readable". With owner-only SELECT, the table is no longer directly readable by anyone else, so the strictest form of the rule holds at the database layer.
- *Alternative considered:* encode audiences in RLS with a `SECURITY DEFINER` function that reads `athlete_visibility_settings` and `athlete_connections`, past their owner-only policies. Rejected for three reasons:
  - It adds a privileged function.
  - It duplicates the audience rule in SQL.
  - It diverges from the `club_memberships` / `athlete_metric_entries` pattern.

Narrowing an existing policy needs explicit user confirmation at apply time, and the full `tests/rls/` suite must run.

### D6. Record the default departure in a new ADR

- ADR-013 §7 says a missing row resolves to the most restrictive setting, and the ADR README requires a superseding ADR rather than a silent edit.
- New `docs/adr/014-achievement-visibility-default.md` supersedes that clause for achievements only:
  - Achievements default to `PUBLIC`, because they are L0-PUBLIC, verified, and central to the profile.
  - Clubs and metrics keep `PRIVATE`.
- The ADR README lists ADR-014 and marks ADR-013 as partially superseded (§7 default, achievements only).

## Risks / Trade-offs

- [Narrowing the output drops `athleteId`, `verificationSource`, and `createdAt` from `listAchievements`] → `turbo typecheck` catches any consumer, through tRPC inference. The two mobile screens read none of these fields.
- [Making the procedure public exposes it to anonymous traffic] → The output carries no L1 fields, results are filtered by audience, and the existing public rate-limit tier applies to unauthenticated calls.
- [Narrowing RLS SELECT could break a client that reads `athlete_achievements` directly through Supabase] → None exists (grep across `apps/` and `packages/` found no `from('athlete_achievements')`). The RLS test file flips the "any authenticated user can SELECT" case into a cross-tenant deny-test.
- [The default differs between categories, which is easy to get wrong in new code] → The defaults live in one map (D1). The unit tests iterate every category × audience × relation, plus the missing-row case per category.
- [`listAchievements` is unpaginated, against the AGENTS.md performance rule] → This gap already exists and this change does not introduce it. Per-athlete achievement counts are small. Record it as a follow-up for Change 9, which will add a public profile read path anyway.

## Migration Plan

1. Zod: validators and tests.
2. Prisma: add the column. Run `prisma generate` and `prisma validate`, then **STOP**: the user runs `prisma migrate dev --name add_achievements_audience`.
3. API service, router, and tests.
4. With user confirmation: apply the narrowed `supabase/policies/athlete_achievements.sql` with `psql`, then run the full `tests/rls/` suite.
5. Update seed and docs.

**Rollback:**

- Re-apply the previous SELECT policy (`USING (TRUE)`).
- Revert the API.
- Drop the column with a follow-up migration. Data loss is limited to athletes' achievement-audience choices.
