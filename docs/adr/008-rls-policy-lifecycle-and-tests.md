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

## OcrJob policy constraint

`ocr_jobs` must use a direct athlete predicate: `USING (auth.uid() = athlete_id)`. Join-based RLS on `medical_documents` is forbidden for this table.
