-- ============================================
-- Table:        club_memberships      (Prisma model `ClubMembership`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/club_memberships.sql
-- Tested in:    tests/rls/club_memberships.test.ts
--
-- Data classification:
--   club_id is L0-PUBLIC; every other field is L1-INTERNAL.
--
-- Trust model (ADR-013, design D6):
--   - SELECT: the athlete, and trainers of the membership's club.
--   - INSERT: only a trainer of the club, as an invitation
--     (PENDING_ATHLETE_CONFIRMATION) signed with their own club_trainers row.
--   - UPDATE: only the athlete, only while the row is open. Which edges are
--     legal (PENDING → ACTIVE | REJECTED, ACTIVE → COMPLETED) and column
--     immutability are enforced for every writer by the trigger in
--     supabase/constraints/club_membership_transitions.sql, because a policy
--     cannot see the pre-update status in WITH CHECK.
--   - DELETE: none (rows are history; deletePII removes them as service_role).
--   Visibility to other audiences is enforced by the API visibility service;
--   RLS here only grants the parties to the membership.
-- ============================================

ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      club_memberships_select_athlete
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read their own memberships in every status.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: 2 SELECT policies (this + club_memberships_select_club_trainer),
--              OR-composed. Each is scoped to a party of the row; neither is
--              a broad TRUE, so the union is exactly {athlete, club trainers}.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "club_memberships_select_athlete"
  ON public.club_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = club_memberships.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      club_memberships_select_club_trainer
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Trainers of the club can read its memberships (roster and the
--              invitations they sent). Membership rows carry no athlete
--              profile data; metric entries are gated separately by ACTIVE.
-- NULL safety: club_id is NOT NULL.
-- Composition: 2 SELECT policies, see club_memberships_select_athlete.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "club_memberships_select_club_trainer"
  ON public.club_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_trainers ct
      JOIN public.user_accounts ua ON ua.id = ct.user_account_id
      WHERE ct.club_id = club_memberships.club_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      club_memberships_insert_club_trainer
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     A trainer can invite an athlete to their own club only. The
--              inviting club_trainers row must be the caller's and belong to
--              the same club, and the row must start as an invitation.
-- NULL safety: club_id, invited_by_club_trainer_id, status are NOT NULL.
--              responded_at / ended_at are nullable and must be NULL here.
-- Composition: ONLY INSERT policy on this table.
-- USING vs WITH CHECK: INSERT has no USING; the predicate goes in WITH CHECK.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "club_memberships_insert_club_trainer"
  ON public.club_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    club_memberships.status = 'PENDING_ATHLETE_CONFIRMATION'
    AND club_memberships.responded_at IS NULL
    AND club_memberships.ended_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.club_trainers ct
      JOIN public.user_accounts ua ON ua.id = ct.user_account_id
      WHERE ct.id = club_memberships.invited_by_club_trainer_id
        AND ct.club_id = club_memberships.club_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      club_memberships_update_athlete
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     Only the athlete can respond to an invitation or leave.
-- NULL safety: athlete_id and status are NOT NULL.
-- Composition: ONLY UPDATE policy on this table. Trainers have no UPDATE path.
-- USING vs WITH CHECK (they differ on purpose):
--   USING restricts the pre-image to the caller's OPEN rows
--   (PENDING_ATHLETE_CONFIRMATION, ACTIVE) so terminal rows are not even
--   targetable. WITH CHECK requires the post-image to still be the caller's
--   and to land on a status an athlete may set (ACTIVE, REJECTED, COMPLETED).
--   The exact edge is validated by the transition trigger.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "club_memberships_update_athlete"
  ON public.club_memberships
  FOR UPDATE
  TO authenticated
  USING (
    club_memberships.status IN ('PENDING_ATHLETE_CONFIRMATION', 'ACTIVE')
    AND EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = club_memberships.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    club_memberships.status IN ('ACTIVE', 'REJECTED', 'COMPLETED')
    AND EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = club_memberships.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- DELETE: intentionally omitted. Memberships are history; the deletePII
--         Habeas Data job removes them as service_role.
