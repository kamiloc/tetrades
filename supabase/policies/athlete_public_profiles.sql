-- ============================================
-- Table:        athlete_public_profiles
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_public_profiles.sql
-- Tested in:    tests/rls/athlete_public_profiles.test.ts
--
-- Data classification:
--   All fields are L0-PUBLIC. This is the public face of an athlete used
--   for SSR profile pages, search, and the public directory.
--
-- Trust model:
--   - SELECT: anonymous and authenticated users may read every row.
--   - INSERT / UPDATE: only the owning athlete (auth.uid() → user_account →
--     athlete.id = athlete_id) may write their own profile row.
--   - DELETE: omitted. Deletion happens via the deletePII service_role job.
--
-- Cross-reference:
--   avatar_asset_id is FK-validated by supabase/constraints/avatar_ownership.sql
--   (a trigger), which is independent of RLS but covers the cross-tenant
--   avatar swap attack.
-- ============================================

ALTER TABLE public.athlete_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_public_profiles FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_public_profiles_select_public
-- Command:     SELECT
-- Role:        anon, authenticated
-- Purpose:     Public profiles are world-readable.
-- NULL safety: avatar_asset_id is nullable but the policy does not predicate
--              on it. Readers must tolerate a NULL avatar in the application
--              layer.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_public_profiles_select_public"
  ON public.athlete_public_profiles
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_public_profiles_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     An athlete can create their own public profile row.
-- NULL safety: athlete_id is NOT NULL (PK). Subquery cannot match NULL.
-- Composition: ONLY INSERT policy on this table.
-- USING vs WITH CHECK: INSERT has no USING (no pre-image), only WITH CHECK.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_public_profiles_insert_own"
  ON public.athlete_public_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_public_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_public_profiles_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     An athlete can update their own public profile row.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   USING gates which row is editable; WITH CHECK pins the post-image to the
--   same athlete_id (prevents re-parenting). Predicates are intentionally
--   identical and applied to both pre- and post-image.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_public_profiles_update_own"
  ON public.athlete_public_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_public_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_public_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- DELETE: intentionally omitted. Profile deletion is part of the deletePII
--         Habeas Data cascade under service_role.
