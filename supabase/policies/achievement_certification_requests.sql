-- ============================================
-- Table:        achievement_certification_requests
--               (Prisma model `AchievementCertificationRequest`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/achievement_certification_requests.sql
-- Tested in:    tests/rls/achievement_certification_requests.test.ts
--
-- Data classification:
--   club_id is L0-PUBLIC; every other field is L1-INTERNAL. rejection_reason
--   is free text written by a trainer and is shown only to the athlete
--   through the API.
--
-- Trust model (add-achievement-certification, design D6; ADR-016):
--   - SELECT: the athlete who owns the achievement (every status), and
--     trainers of the request's club while the request is PENDING.
--   - INSERT / UPDATE / DELETE: none. Every write goes through the API's
--     certification service (service role); the lifecycle is enforced for
--     every writer by supabase/constraints/achievement_certification_transitions.sql
--     and the one-open-request rule by the partial unique index
--     (supabase/constraints/achievement_certification_open_unique.sql).
--   Achievement details (title, organization, date) stay in
--   athlete_achievements, whose RLS remains owner-only (ADR-014); trainers
--   get them only through the API.
-- ============================================

ALTER TABLE public.achievement_certification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_certification_requests FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      achievement_certification_requests_select_athlete
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read every certification request for their
--              own achievements, in every status, including rejection reasons.
-- NULL safety: achievement_id is NOT NULL; athletes.user_account_id is NOT
--              NULL. The decision columns (decided_by_club_trainer_id,
--              decided_at, rejection_reason) are nullable but unused here.
-- Composition: 2 SELECT policies (this + ..._select_club_trainer),
--              OR-composed. Each is scoped to a party of the row; neither is
--              a broad TRUE, so the union is exactly {athlete, club trainers
--              while PENDING}.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "achievement_certification_requests_select_athlete"
  ON public.achievement_certification_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athlete_achievements aa
      JOIN public.athletes a ON a.id = aa.athlete_id
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE aa.id = achievement_certification_requests.achievement_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      achievement_certification_requests_select_club_trainer
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Trainers of the request's club can read it while it is
--              PENDING, to decide it. Decided and cancelled requests drop out
--              of their view (trainer-access-boundary spec).
-- NULL safety: club_id and status are NOT NULL. decided_by_club_trainer_id is
--              NULL on every PENDING row and is not referenced.
-- Composition: 2 SELECT policies, see ..._select_athlete.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "achievement_certification_requests_select_club_trainer"
  ON public.achievement_certification_requests
  FOR SELECT
  TO authenticated
  USING (
    achievement_certification_requests.status = 'PENDING'
    AND EXISTS (
      SELECT 1
      FROM public.club_trainers ct
      JOIN public.user_accounts ua ON ua.id = ct.user_account_id
      WHERE ct.club_id = achievement_certification_requests.club_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
