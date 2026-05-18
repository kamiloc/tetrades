-- ============================================
-- Table:        user_accounts
-- Apply with:   psql $DATABASE_URL -f supabase/policies/user_accounts.sql
-- Tested in:    tests/rls/user_accounts.test.ts
--
-- Data classification:
--   user_accounts contains L1-INTERNAL fields (supabaseUserId, role, status).
--   No L2-CONFIDENTIAL fields. No L0-PUBLIC reads through this table —
--   athlete public lookups go through athletes / athlete_public_profiles.
--
-- Trust model:
--   Authenticated users may only see their own row, mapped via
--   user_accounts.supabase_user_id = auth.uid()::text.
--
--   Row creation, role mutation, and account deletion are handled by the
--   API server using the service_role key (which bypasses RLS), so no
--   INSERT / UPDATE / DELETE policies are defined for the authenticated role.
-- ============================================

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      user_accounts_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     An authenticated user can read their own user_accounts row.
-- NULL safety: supabase_user_id is NOT NULL (declared @unique in Prisma).
--              auth.uid() may be NULL for anon — anon role is not granted here
--              so the policy never evaluates with a NULL left-hand side.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "user_accounts_select_own"
  ON public.user_accounts
  FOR SELECT
  TO authenticated
  USING (supabase_user_id = auth.uid()::text);

-- INSERT: intentionally omitted. Account creation is a service_role flow
--         (server-side after Supabase Auth confirms the email).
-- UPDATE: intentionally omitted. Role / status changes are administrative
--         and must go through service_role.
-- DELETE: intentionally omitted. Account deletion is handled by the
--         deletePII background job under service_role (Habeas Data flow).
