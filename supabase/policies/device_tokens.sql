-- ============================================
-- Table:        device_tokens         (Prisma model `DeviceToken`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/device_tokens.sql
-- Tested in:    tests/rls/device_tokens.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. A push token identifies a device.
--
-- Trust model (membership-notifications spec, design D9):
--   Owner-only. A user may read, register, refresh, and remove only their
--   own tokens. No trainer, club, or other athlete access. The notifications
--   worker resolves tokens as service_role.
-- ============================================

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      device_tokens_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     A user can read their own device tokens.
-- NULL safety: user_account_id is NOT NULL.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "device_tokens_select_own"
  ON public.device_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = device_tokens.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      device_tokens_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     A user can register a token only for their own account.
-- NULL safety: user_account_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "device_tokens_insert_own"
  ON public.device_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = device_tokens.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      device_tokens_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     A user can refresh their own token rows (e.g. last_seen_at).
-- NULL safety: user_account_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   Identical predicates on pre- and post-image, so a row cannot be
--   re-parented to another account during UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "device_tokens_update_own"
  ON public.device_tokens
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = device_tokens.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = device_tokens.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      device_tokens_delete_own
-- Command:     DELETE
-- Role:        authenticated
-- Purpose:     A user can remove their own tokens (sign-out on a device).
-- NULL safety: user_account_id is NOT NULL.
-- Composition: ONLY DELETE policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "device_tokens_delete_own"
  ON public.device_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = device_tokens.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
