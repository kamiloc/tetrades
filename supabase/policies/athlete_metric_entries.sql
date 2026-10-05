-- ============================================
-- Table:        athlete_metric_entries (Prisma model `AthleteMetricEntry`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/athlete_metric_entries.sql
-- Tested in:    tests/rls/athlete_metric_entries.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL.
--
-- Trust model (ADR-013, design D4/D6):
--   - SELECT: the athlete; trainers of the club whose membership authorized
--     the entry, only while that membership is ACTIVE.
--   - INSERT: only a trainer of the club, only against an ACTIVE membership,
--     signed with their own club_trainers row. PENDING_ATHLETE_CONFIRMATION,
--     COMPLETED and REJECTED grant nothing. The trigger in
--     supabase/constraints/athlete_metric_entry_active_membership.sql repeats
--     the check for every writer and also pins athlete_id to the membership.
--   - UPDATE / DELETE: none. Entries are append-only; deletePII removes them
--     as service_role.
--   Summaries are derived by the API (service role) in the same transaction;
--   a direct client insert does not update athlete_metric_summaries.
-- ============================================

ALTER TABLE public.athlete_metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_metric_entries FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_metric_entries_select_athlete
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The athlete can read all of their own entries.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: 2 SELECT policies (this +
--              athlete_metric_entries_select_active_club_trainer), OR-composed.
--              Neither is broad; the union is {athlete, ACTIVE-club trainers}.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_metric_entries_select_athlete"
  ON public.athlete_metric_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = athlete_metric_entries.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_metric_entries_select_active_club_trainer
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Trainers of the entry's club read it only while the authorizing
--              membership is ACTIVE; access ends when it becomes COMPLETED.
-- NULL safety: club_membership_id is NOT NULL.
-- Composition: 2 SELECT policies, see athlete_metric_entries_select_athlete.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_metric_entries_select_active_club_trainer"
  ON public.athlete_metric_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_memberships m
      JOIN public.club_trainers ct ON ct.club_id = m.club_id
      JOIN public.user_accounts ua ON ua.id = ct.user_account_id
      WHERE m.id = athlete_metric_entries.club_membership_id
        AND m.status = 'ACTIVE'
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      athlete_metric_entries_insert_active_club_trainer
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     A trainer can report an entry only for an athlete with an
--              ACTIVE membership in the trainer's club, as themselves.
-- NULL safety: athlete_id, club_membership_id, reported_by_club_trainer_id
--              are NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- USING vs WITH CHECK: INSERT has no USING; the predicate goes in WITH CHECK.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "athlete_metric_entries_insert_active_club_trainer"
  ON public.athlete_metric_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.club_memberships m
      JOIN public.club_trainers ct ON ct.club_id = m.club_id
      JOIN public.user_accounts ua ON ua.id = ct.user_account_id
      WHERE m.id = athlete_metric_entries.club_membership_id
        AND m.athlete_id = athlete_metric_entries.athlete_id
        AND m.status = 'ACTIVE'
        AND ct.id = athlete_metric_entries.reported_by_club_trainer_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- UPDATE / DELETE: intentionally omitted. Entries are append-only
--                  (sport-metrics spec); deletePII removes them as service_role.
