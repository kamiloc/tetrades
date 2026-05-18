-- ============================================
-- Table:        athletes
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athletes.sql
-- Tested in:    tests/rls/athletes.test.ts
--
-- Data classification:
--   athletes carries a mix of L0-PUBLIC (slug, displayName, sportId,
--   countryCode), L1-INTERNAL (userAccountId, profileStatus), and
--   L3-RESTRICTED (isUnderLegalHold). Because RLS is row-level, exposing the
--   row exposes every column on it, including the legal-hold flag.
--
-- Trust model:
--   - Authenticated users can SELECT and UPDATE only their own athlete row,
--     resolved via athletes.user_account_id → user_accounts.supabase_user_id.
--   - Public-facing data (for SSR profile pages and search) is served from
--     athlete_public_profiles, which has its own permissive SELECT policy.
--   - Athlete row creation and isUnderLegalHold mutation are service_role
--     operations and bypass RLS.
-- ============================================

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athletes_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     An athlete can read their own athletes row in full.
-- NULL safety: athletes.user_account_id is NOT NULL (declared @unique in
--              Prisma). The subquery never produces a NULL comparison.
-- Composition: ONLY SELECT policy on this table — no permissive
--              OR-composition can widen visibility.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athletes_select_own"
  ON public.athletes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = athletes.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athletes_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     An athlete can update their own athletes row.
-- NULL safety: Same as SELECT — user_account_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   USING gates which rows are visible for UPDATE (only own row).
--   WITH CHECK enforces that the new row still belongs to the same user
--   account — preventing an athlete from re-parenting their row to another
--   user_account_id during UPDATE.
--   The two predicates differ ONLY because WITH CHECK pins the post-image
--   to the same user_account_id; this is intentional and documented here.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athletes_update_own"
  ON public.athletes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = athletes.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = athletes.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- INSERT: intentionally omitted. Athlete rows are created server-side
--         during onboarding (service_role) so user_account_id and slug
--         can be set under a transaction.
-- DELETE: intentionally omitted. Athlete deletion happens through the
--         deletePII Habeas Data job under service_role.
