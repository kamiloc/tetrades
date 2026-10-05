-- ============================================
-- Table:        metric_definitions    (Prisma model `MetricDefinition`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/metric_definitions.sql
-- Tested in:    tests/rls/metric_definitions.test.ts
--
-- Data classification:
--   All fields are L0-PUBLIC. This is the metric catalog, populated by seed /
--   service_role; it contains no athlete data.
--
-- Trust model:
--   Anonymous and authenticated users may read all rows, including inactive
--   definitions (historical entries still reference them).
--   Mutations are service_role only — no INSERT / UPDATE / DELETE policies.
-- ============================================

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_definitions FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      metric_definitions_select_public
-- Command:     SELECT
-- Role:        anon, authenticated
-- Purpose:     The metric catalog is public reference data.
-- NULL safety: No nullable predicates — the policy is unconditionally TRUE.
--              sport_id is nullable but unused in the predicate.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "metric_definitions_select_public"
  ON public.metric_definitions
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- INSERT / UPDATE / DELETE: intentionally omitted. Catalog mutations are
-- service_role operations (sport-metrics spec: no API writes).
