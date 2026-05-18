-- ============================================
-- Table:        data_lifecycle_requests
-- Apply with:   psql $DATABASE_URL -f supabase/policies/data_lifecycle_requests.sql
-- Tested in:    tests/rls/data_lifecycle_requests.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. Rows represent Habeas Data requests an
--   athlete has made (EXPORT / DELETION / RECTIFICATION) plus their
--   processing status (REQUESTED, IN_PROGRESS, COMPLETED, FAILED, or
--   BLOCKED_LEGAL_HOLD).
--
-- Trust model (per task 2.3 decision):
--   - SELECT: each athlete reads only their own rows (athlete_id resolved
--     via user_accounts → auth.uid()).
--   - INSERT: an athlete can file their own request (WITH CHECK pins
--     athlete_id to the caller). requested_by must be the caller's
--     user_account.id — this is enforced at the application layer
--     because RLS cannot easily compare requested_by to the caller without
--     a separate subquery; the policy WITH CHECK enforces athlete_id and
--     leaves the requested_by integrity check to the API.
--   - UPDATE: service_role only. Workflow transitions (IN_PROGRESS,
--     COMPLETED, BLOCKED_LEGAL_HOLD, FAILED) happen in background jobs.
--   - DELETE: omitted. Lifecycle requests are retained for the same 5-year
--     window as audit events (CLAUDE.md "Retention & Legal Hold").
-- ============================================

ALTER TABLE public.data_lifecycle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_lifecycle_requests FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      data_lifecycle_requests_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Athletes read only their own data lifecycle requests.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "data_lifecycle_requests_select_own"
  ON public.data_lifecycle_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = data_lifecycle_requests.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      data_lifecycle_requests_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     Athletes can file Habeas Data requests for themselves.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "data_lifecycle_requests_insert_own"
  ON public.data_lifecycle_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = data_lifecycle_requests.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- UPDATE: intentionally omitted. Status transitions are driven by background
--         jobs running under service_role (export generation, deletePII,
--         legal-hold checks).
-- DELETE: intentionally omitted. 5-year retention per CLAUDE.md.
