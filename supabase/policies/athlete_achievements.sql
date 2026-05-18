-- ============================================
-- Table:        athlete_achievements
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_achievements.sql
-- Tested in:    tests/rls/athlete_achievements.test.ts
--
-- Data classification:
--   All fields are L0-PUBLIC. However per task 2.3 decision the SELECT
--   surface is intentionally narrower than the classification would allow:
--   authenticated-only (no anon). Public profile pages source achievements
--   via the tRPC server-side caller (service_role bypasses RLS), so anon
--   access is not required here.
--
-- Trust model:
--   - SELECT: any authenticated user can read any athlete's achievements
--             (enables the in-app social feed / verification view).
--   - INSERT / UPDATE / DELETE: only the owning athlete.
-- ============================================

ALTER TABLE public.athlete_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_achievements FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_achievements_select_authenticated
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Any signed-in user can browse achievements across the network.
-- NULL safety: No nullable predicate. The policy is unconditionally TRUE for
--              authenticated callers.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_achievements_select_authenticated"
  ON public.athlete_achievements
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_achievements_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     An athlete can add achievements only to their own record.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_achievements_insert_own"
  ON public.athlete_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_achievements.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_achievements_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     An athlete can edit their own achievements.
--              verificationStatus / verificationSource transitions to
--              VERIFIED are service_role flows (federation evidence). The
--              row remains owner-editable for other fields.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK: Identical predicate prevents re-parenting on UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_achievements_update_own"
  ON public.athlete_achievements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_achievements.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_achievements.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_achievements_delete_own
-- Command:     DELETE
-- Role:        authenticated
-- Purpose:     An athlete can delete their own achievements.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY DELETE policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_achievements_delete_own"
  ON public.athlete_achievements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_achievements.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
