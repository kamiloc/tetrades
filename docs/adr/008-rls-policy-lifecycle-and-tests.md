# ADR-008: RLS Policy Lifecycle and Tests

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Treat RLS as the highest-risk security layer and manage it through dedicated SQL files plus mandatory tests.

## Rules

- one SQL file per table under `supabase/policies`
- do not place RLS in migrations or app code
- every file enables and forces RLS
- every policy has a Vitest file under `tests/rls`
- every test suite covers allow, deny, and NULL-key behavior
- deny-tests must explicitly exercise cross-tenant access
- policy changes require running the full RLS suite

## Note

Watch out for PostgreSQL OR-composition across multiple policies of the same command type.

## Child-table policy constraint

Tables owned by an athlete should carry a direct `athlete_id` and use a direct predicate (for example `USING (auth.uid() = athlete_id)`) rather than a join through a parent table. Join-based RLS is allowed only where a direct predicate is impossible, and then it needs an explicit comment and deny-test. (This rule originated with `ocr_jobs`, which is removed by [ADR-013](013-pivot-clubs-metrics-trainer-portal-and-visibility.md).)

Trainer and club access policies (`ClubMembership`, `AthleteMetricEntry`) must check for an `ACTIVE` membership and are covered by deny-tests, including the pending-membership case.
