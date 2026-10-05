-- Enforce the club membership lifecycle (ADR-013 §5) for every writer,
-- including service_role, so the database agrees with the shared-logic
-- transition table:
--   PENDING_ATHLETE_CONFIRMATION → ACTIVE | REJECTED
--   ACTIVE → COMPLETED
--   COMPLETED, REJECTED are terminal.
-- New rows must start as PENDING_ATHLETE_CONFIRMATION with no response or end
-- timestamps, and the identifying columns are immutable after insert.
-- This is applied after the add_clubs_metrics_visibility Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/club_membership_transitions.sql

CREATE OR REPLACE FUNCTION check_club_membership_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING_ATHLETE_CONFIRMATION'
       OR NEW.responded_at IS NOT NULL
       OR NEW.ended_at IS NOT NULL THEN
      RAISE EXCEPTION 'A club membership must start as PENDING_ATHLETE_CONFIRMATION';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.club_id <> OLD.club_id
     OR NEW.athlete_id <> OLD.athlete_id
     OR NEW.invited_by_club_trainer_id <> OLD.invited_by_club_trainer_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Club membership identity columns are immutable';
  END IF;

  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'PENDING_ATHLETE_CONFIRMATION' AND NEW.status IN ('ACTIVE', 'REJECTED'))
    OR (OLD.status = 'ACTIVE' AND NEW.status = 'COMPLETED')
  ) THEN
    RAISE EXCEPTION 'Club membership transition % -> % is not allowed', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_club_membership_transition ON club_memberships;
CREATE TRIGGER trg_check_club_membership_transition
  BEFORE INSERT OR UPDATE
  ON club_memberships
  FOR EACH ROW
  EXECUTE FUNCTION check_club_membership_transition();
