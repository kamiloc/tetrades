-- Enforce the achievement certification request lifecycle
-- (add-achievement-certification, design D2) for every writer, including
-- service_role:
--   PENDING → APPROVED | REJECTED | CANCELLED
--   APPROVED, REJECTED, CANCELLED are terminal.
-- New rows must start PENDING with no decision fields. APPROVED and REJECTED
-- need the deciding trainer and time; REJECTED also needs a reason. The
-- identifying columns are immutable after insert.
-- Applied after the add_achievement_certification Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/achievement_certification_transitions.sql
CREATE OR REPLACE FUNCTION check_achievement_certification_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING'
       OR NEW.decided_by_club_trainer_id IS NOT NULL
       OR NEW.decided_at IS NOT NULL
       OR NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'A certification request must start as PENDING with no decision';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.achievement_id <> OLD.achievement_id
     OR NEW.club_id <> OLD.club_id
     OR NEW.club_membership_id <> OLD.club_membership_id
     OR NEW.requested_at <> OLD.requested_at THEN
    RAISE EXCEPTION 'Certification request identity columns are immutable';
  END IF;

  IF OLD.status <> 'PENDING' THEN
    -- Terminal rows are history: nothing on them may change.
    IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
      RAISE EXCEPTION 'A % certification request cannot be changed', OLD.status;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Certification transition PENDING -> % is not allowed', NEW.status;
  END IF;

  IF NEW.status IN ('APPROVED', 'REJECTED')
     AND (NEW.decided_by_club_trainer_id IS NULL OR NEW.decided_at IS NULL) THEN
    RAISE EXCEPTION 'A % certification request needs the deciding trainer and time', NEW.status;
  END IF;

  IF NEW.status = 'REJECTED'
     AND (NEW.rejection_reason IS NULL OR btrim(NEW.rejection_reason) = '') THEN
    RAISE EXCEPTION 'A rejected certification request needs a reason';
  END IF;

  IF NEW.status <> 'REJECTED' AND NEW.rejection_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Only a rejected certification request may carry a reason';
  END IF;

  IF NEW.status IN ('PENDING', 'CANCELLED')
     AND (NEW.decided_by_club_trainer_id IS NOT NULL OR NEW.decided_at IS NOT NULL) THEN
    RAISE EXCEPTION 'A % certification request has no deciding trainer', NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_achievement_certification_transition
  ON achievement_certification_requests;
CREATE TRIGGER trg_check_achievement_certification_transition
  BEFORE INSERT OR UPDATE
  ON achievement_certification_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_achievement_certification_transition();
