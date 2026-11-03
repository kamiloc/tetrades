-- ============================================
-- Table:        club_trainers         (Prisma model `ClubTrainer`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/club_trainers.sql
-- Tested in:    tests/rls/club_trainers.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. A row is the only thing that makes a user a
--   trainer of a club (ADR-013: no global trainer role).
--
-- Trust model:
--   - SELECT: a user sees only their own trainer rows. Other policies
--     (club_memberships, athlete_metric_entries) resolve "caller is a trainer
--     of club X" with a subquery on this table; that subquery runs under
--     this policy, so it sees exactly the caller's rows and no policy refers
--     back to itself (no recursion).
--   - Club peers do NOT see each other's rows. Design D6 suggested peer
--     visibility; it would need a self-referencing policy or a SECURITY
--     DEFINER helper, and no client read path needs it (the API reads via
--     Prisma). Narrower is the safe default.
--   - Mutations are service_role / API only. A row is created when the
--     invitee accepts a trainer invitation (ADR-017). Rows are never deleted:
--     admin.revokeTrainer sets revoked_at, and accepting a new invitation to
--     the same club clears it.
--   - Revoked rows stay visible to their owner here (history). A revoked row,
--     or any row of a deactivated club, grants nothing: every policy that
--     resolves trainer authority from this table also requires
--     `ct.revoked_at IS NULL AND public.club_is_active(ct.club_id)`
--     (club_memberships, athlete_metric_entries,
--     achievement_certification_requests, and the metric-entry trigger).
--   - One capacity per account: supabase/constraints/account_single_capacity.sql
--     rejects a row for an account with an athlete profile or role ADMIN.
-- ============================================

ALTER TABLE public.club_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_trainers FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      club_trainers_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     A trainer can read their own club_trainers rows, revoked ones
--              included.
-- NULL safety: user_account_id is NOT NULL.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "club_trainers_select_own" ON public.club_trainers;
CREATE POLICY "club_trainers_select_own"
  ON public.club_trainers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = club_trainers.user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- INSERT / UPDATE / DELETE: intentionally omitted. Trainer provisioning and
-- revocation go through the API on its own connection.
