-- ============================================
-- Table:        athlete_connections
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_connections.sql
-- Tested in:    tests/rls/athlete_connections.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. Connections are visible to the two parties
--   only — not to other authenticated users — because a pending or
--   declined request between two specific athletes is itself sensitive.
--
-- Trust model:
--   - SELECT: requester_id or addressee_id matches the caller's athlete.id.
--   - INSERT: WITH CHECK enforces that requester_id is the caller (you can
--     only initiate connection requests as yourself).
--   - UPDATE: either party can transition status (e.g. addressee ACCEPTs,
--     requester WITHDRAWs by transitioning to DECLINED before response).
--   - DELETE: either party can remove the connection.
-- ============================================

ALTER TABLE public.athlete_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_connections FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_connections_select_parties
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Both the requester and the addressee can see the row.
-- NULL safety: requester_id and addressee_id are NOT NULL.
-- Composition: ONLY SELECT policy on this table. The OR is contained inside
--              the single predicate — no permissive-policy widening risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_connections_select_parties"
  ON public.athlete_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE (a.id = athlete_connections.requester_id
          OR a.id = athlete_connections.addressee_id)
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_connections_insert_requester
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     A user can only initiate a connection request AS THEMSELVES,
--              i.e. requester_id must resolve to the caller's athlete.id.
-- NULL safety: requester_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- USING vs WITH CHECK: INSERT has no USING; the predicate goes in WITH CHECK
-- so that the caller cannot spoof another athlete as the requester.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_connections_insert_requester"
  ON public.athlete_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_connections.requester_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_connections_update_parties
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     Either party can transition status (addressee responds,
--              requester withdraws).
-- NULL safety: requester_id and addressee_id are NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   Identical predicate applied to pre- and post-image — prevents re-parenting
--   the row to a different pair of athletes during UPDATE.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_connections_update_parties"
  ON public.athlete_connections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE (a.id = athlete_connections.requester_id
          OR a.id = athlete_connections.addressee_id)
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE (a.id = athlete_connections.requester_id
          OR a.id = athlete_connections.addressee_id)
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_connections_delete_parties
-- Command:     DELETE
-- Role:        authenticated
-- Purpose:     Either party can remove a connection row.
-- NULL safety: requester_id and addressee_id are NOT NULL.
-- Composition: ONLY DELETE policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_connections_delete_parties"
  ON public.athlete_connections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE (a.id = athlete_connections.requester_id
          OR a.id = athlete_connections.addressee_id)
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
