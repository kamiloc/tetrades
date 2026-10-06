-- ============================================
-- Table:        athlete_achievements
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_achievements.sql
-- Tested in:    tests/rls/athlete_achievements.test.ts
--
-- Data classification:
--   All fields are L0-PUBLIC except created_at (L1-INTERNAL).
--
-- Trust model (athlete-visibility spec, ADR-014):
--   - SELECT: only the owning athlete. Other audiences (connections,
--             strangers, anonymous visitors) are served by the API, which
--             applies the athlete's achievements audience (default PUBLIC)
--             and returns only VERIFIED rows in the public shape. RLS grants
--             only the owner, like club_memberships and athlete_metric_entries,
--             so no other party can read this table directly.
--   - INSERT / UPDATE / DELETE: only the owning athlete.
-- ============================================

ALTER TABLE public.athlete_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_achievements FORCE ROW LEVEL SECURITY;

-- Replaced by athlete_achievements_select_own (add-achievement-visibility).
DROP POLICY IF EXISTS "athlete_achievements_select_authenticated" ON public.athlete_achievements;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_achievements_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read their own achievements in every
--              verification status. Nobody else reads this table directly.
-- NULL safety: athlete_id is NOT NULL; a NULL auth.uid() (anon) matches no
--              user_accounts row, so the EXISTS is false and nothing is visible.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_achievements_select_own"
  ON public.athlete_achievements
  FOR SELECT
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
