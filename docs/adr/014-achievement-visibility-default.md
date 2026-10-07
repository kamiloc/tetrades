# ADR-014: Achievement Visibility and Its PUBLIC Default

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes:** [ADR-013](013-pivot-clubs-metrics-trainer-portal-and-visibility.md) §7, only the clause "a missing `AthleteVisibilitySettings` row resolves to the most restrictive setting", and only for achievements

## Context

ADR-013 gave athletes audience control over club memberships and sport metrics. A missing settings row means the most restrictive audience (`PRIVATE`).

Achievements had no audience control. Any signed-in user could read any athlete's `VERIFIED` achievements, both through the API and through an RLS `USING (TRUE)` policy.

The project owner decided on 2026-10-05:
- achievements become visibility-editable
- public-profile fields keep their current behavior
- an athlete who never sets the achievements audience keeps today's behavior

Achievements are L0-PUBLIC, verified by the platform, and the core of a LinkedIn-style profile. Defaulting them to `PRIVATE` would empty every existing public profile until each athlete opted in.

## Decision

- `AthleteVisibilitySettings` gains a third category, `achievementsAudience`, with the same audiences: `PRIVATE`, `CONNECTIONS`, `PUBLIC`.
- **Defaults are per category.**
  - Achievements default to `PUBLIC`.
  - Club memberships and metrics keep `PRIVATE`.
  - A stored row and a missing row mean the same thing: the column default matches the service default.
  - The defaults are defined once, in `CATEGORY_DEFAULT_AUDIENCE` in `apps/api/src/services/visibility.ts`.
- **Who sees what.**
  - Non-owners see only `VERIFIED` achievements, and only when the audience admits them.
  - The owner always sees all of their achievements.
  - Trainers get no extra access through club membership.
- **Where it is enforced.** The visibility service is the enforcement point, list and detail alike, as ADR-013 §7 requires. RLS SELECT on `athlete_achievements` is narrowed to the owning athlete, so no other party can read the table directly. This follows the `club_memberships` / `athlete_metric_entries` pattern.
- `achievement.listAchievements` is a public procedure, so a `PUBLIC` audience includes anonymous callers. It returns only public fields to every caller.

Everything else in ADR-013 §7 still applies to every category, including achievements.

## Consequences

- New code must not assume a single default audience. Read the category's default from `CATEGORY_DEFAULT_AUDIENCE`.
- Public web profiles (`/athlete/[slug]`) can show achievements for athletes who never configured visibility.
- An athlete who wants achievements hidden must change the setting. The visibility settings UI (mobile and web) must show the current value, which is `PUBLIC` by default, rather than implying `PRIVATE`.
- Built by openspec change `add-achievement-visibility`.
