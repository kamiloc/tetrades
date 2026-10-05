-- ============================================
-- Table:        athlete_metric_summaries (Prisma model `AthleteMetricSummary`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_metric_summaries.sql
-- Tested in:    tests/rls/athlete_metric_summaries.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL.
--
-- Trust model:
--   - SELECT: the athlete only. A summary aggregates entries from every club,
--     so it is not club-scoped and trainers get no direct read.
--   - INSERT / UPDATE / DELETE: none. Summaries are derived by the API
--     (service role) inside the reportEntry transaction (sport-metrics spec).
-- ============================================

ALTER TABLE public.athlete_metric_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_metric_summaries FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_metric_summaries_select_athlete
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read their own summaries.
-- NULL safety: athlete_id is NOT NULL (part of the PK).
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_metric_summaries_select_athlete"
  ON public.athlete_metric_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_metric_summaries.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- INSERT / UPDATE / DELETE: intentionally omitted. Derived data, written by
-- service_role only.
