-- ============================================
-- Table:        athlete_visibility_settings (Prisma model `AthleteVisibilitySettings`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_visibility_settings.sql
-- Tested in:    tests/rls/athlete_visibility_settings.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL.
--
-- Trust model (athlete-visibility spec):
--   Owner-only. No other athlete and no trainer may read or write another
--   athlete's settings. A missing row means PRIVATE for every category.
-- ============================================

ALTER TABLE public.athlete_visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_visibility_settings FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_visibility_settings_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read their own settings.
-- NULL safety: athlete_id is NOT NULL (PK).
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_visibility_settings_select_own"
  ON public.athlete_visibility_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_visibility_settings.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_visibility_settings_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     The athlete can create their own settings row.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_visibility_settings_insert_own"
  ON public.athlete_visibility_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_visibility_settings.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_visibility_settings_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     The athlete can change their own settings.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   Identical predicates applied to pre- and post-image, ensuring the row
--   cannot be re-parented to a different athlete during UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_visibility_settings_update_own"
  ON public.athlete_visibility_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_visibility_settings.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_visibility_settings.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- DELETE: intentionally omitted. Settings rows are removed by the deletePII
--         Habeas Data job (service_role).
