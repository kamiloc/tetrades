-- ============================================
-- Table:        athlete_private_profiles
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_private_profiles.sql
-- Tested in:    tests/rls/athlete_private_profiles.test.ts
--
-- Data classification:
--   Contains L2-CONFIDENTIAL fields (exact DOB, contact email, contact phone,
--   government ID), all stored as `Bytes` encrypted with @packages/crypto.
--   The encryption itself protects the values at rest; RLS keeps the rows
--   from being addressable across tenants.
--
-- Trust model:
--   Only the owning athlete may SELECT / INSERT / UPDATE their own private
--   profile. There is no shared-access role for L2 data in the application
--   layer — see CLAUDE.md "Break-Glass Access Policy" for the database-only
--   service_role bypass procedure.
-- ============================================

ALTER TABLE public.athlete_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_private_profiles FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_private_profiles_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The owning athlete can read their own encrypted L2 payload.
-- NULL safety: athlete_id is NOT NULL (PK). All encrypted fields are
--              nullable but unused in the predicate.
-- Composition: ONLY SELECT policy — no permissive widening possible.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_private_profiles_select_own"
  ON public.athlete_private_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_private_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_private_profiles_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     The owning athlete can create their own private profile row.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_private_profiles_insert_own"
  ON public.athlete_private_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_private_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_private_profiles_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     The owning athlete can update their own private profile row.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   Identical predicates applied to pre- and post-image, ensuring the row
--   cannot be re-parented to a different athlete during UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_private_profiles_update_own"
  ON public.athlete_private_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_private_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_private_profiles.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- DELETE: intentionally omitted. Private profile rows are removed by the
--         deletePII Habeas Data job (service_role).
