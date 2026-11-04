-- A metric entry must reference an ACTIVE membership of the same athlete,
-- and the reporting trainer must belong to that membership's club (design D4).
-- The reporting trainer row must not be revoked and the club must be active
-- (ADR-017): a revoked trainer, or a trainer of a deactivated club, cannot
-- report, through any writer. The club check goes through
-- public.club_is_active() (supabase/policies/clubs.sql, apply that first)
-- because client roles cannot read clubs.deactivated_at.
-- Applies to every writer, including service_role. Entries are append-only:
-- UPDATE is rejected outright; DELETE is left to service_role (deletePII),
-- since no client DELETE policy exists.
-- This is applied after the add_clubs_metrics_visibility Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/athlete_metric_entry_active_membership.sql

CREATE OR REPLACE FUNCTION check_athlete_metric_entry_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Athlete metric entries are append-only';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM club_memberships m
    JOIN club_trainers ct ON ct.club_id = m.club_id
    WHERE m.id = NEW.club_membership_id
      AND m.athlete_id = NEW.athlete_id
      AND m.status = 'ACTIVE'
      AND ct.id = NEW.reported_by_club_trainer_id
      AND ct.revoked_at IS NULL
      AND public.club_is_active(m.club_id)
  ) THEN
    RAISE EXCEPTION 'Metric entry requires an ACTIVE membership of the same athlete with an active club and a non-revoked reporting trainer of that club';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_athlete_metric_entry_membership ON athlete_metric_entries;
CREATE TRIGGER trg_check_athlete_metric_entry_membership
  BEFORE INSERT OR UPDATE
  ON athlete_metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_athlete_metric_entry_membership();
