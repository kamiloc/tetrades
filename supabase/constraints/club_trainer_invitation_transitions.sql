-- Enforce the trainer invitation lifecycle (add-admin-club-trainer-management,
-- design D3; ADR-017) for every writer, including service_role:
--   PENDING → ACCEPTED | DECLINED | REVOKED
--   ACCEPTED, DECLINED, REVOKED are terminal.
-- "Expired" is never stored: it is PENDING with expires_at <= now().
--
-- Rules:
--   - New rows start PENDING with no response, no acceptor and no redaction.
--   - id, club_id, invited_by_user_account_id, created_at and expires_at are
--     immutable after insert (expires_at too, so no writer can extend an
--     invitation's lifetime).
--   - ACCEPTED needs accepted_by_user_account_id and responded_at; DECLINED and
--     REVOKED need responded_at and no acceptor; PENDING has neither.
--   - Terminal rows keep their status, acceptor and response time.
--   - Only an unexpired (expires_at > now()), unredacted PENDING row can become
--     ACCEPTED. Expired rows may still be closed as REVOKED (deactivation and
--     re-invitation do that).
--   - The only allowed email change, in any status, is the redaction (D13,
--     D14): email becomes 'redacted:' || id and redacted_at is set, in the
--     same update. A redacted row's email and redacted_at never change again.
--
-- Applied after the add_admin_club_trainer_management Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/club_trainer_invitation_transitions.sql
-- Tested in: tests/rls/club_trainer_invitations.test.ts

CREATE OR REPLACE FUNCTION check_club_trainer_invitation_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING'
       OR NEW.accepted_by_user_account_id IS NOT NULL
       OR NEW.responded_at IS NOT NULL
       OR NEW.redacted_at IS NOT NULL
       OR NEW.email LIKE 'redacted:%' THEN
      RAISE EXCEPTION 'A trainer invitation must start as PENDING with no response or redaction';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id <> OLD.id
     OR NEW.club_id <> OLD.club_id
     OR NEW.invited_by_user_account_id <> OLD.invited_by_user_account_id
     OR NEW.created_at <> OLD.created_at
     OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'Trainer invitation identity columns are immutable';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.redacted_at IS DISTINCT FROM OLD.redacted_at THEN
    IF OLD.redacted_at IS NOT NULL THEN
      RAISE EXCEPTION 'A redacted trainer invitation cannot be changed';
    END IF;
    IF NEW.redacted_at IS NULL OR NEW.email <> 'redacted:' || NEW.id THEN
      RAISE EXCEPTION 'The only allowed trainer invitation email change is the redaction marker with redacted_at';
    END IF;
  END IF;

  IF OLD.status <> 'PENDING' THEN
    IF NEW.status <> OLD.status
       OR NEW.accepted_by_user_account_id IS DISTINCT FROM OLD.accepted_by_user_account_id
       OR NEW.responded_at IS DISTINCT FROM OLD.responded_at THEN
      RAISE EXCEPTION 'A % trainer invitation cannot be changed', OLD.status;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'PENDING' THEN
    IF NEW.accepted_by_user_account_id IS NOT NULL OR NEW.responded_at IS NOT NULL THEN
      RAISE EXCEPTION 'A PENDING trainer invitation has no response';
    END IF;
  ELSIF NEW.status = 'ACCEPTED' THEN
    IF OLD.expires_at <= now() OR OLD.redacted_at IS NOT NULL THEN
      RAISE EXCEPTION 'An expired or redacted trainer invitation cannot be accepted';
    END IF;
    IF NEW.accepted_by_user_account_id IS NULL OR NEW.responded_at IS NULL THEN
      RAISE EXCEPTION 'An ACCEPTED trainer invitation needs the accepting account and time';
    END IF;
  ELSE
    -- DECLINED or REVOKED (the enum allows nothing else).
    IF NEW.responded_at IS NULL OR NEW.accepted_by_user_account_id IS NOT NULL THEN
      RAISE EXCEPTION 'A % trainer invitation needs a response time and no accepting account', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_club_trainer_invitation_transition
  ON club_trainer_invitations;
CREATE TRIGGER trg_check_club_trainer_invitation_transition
  BEFORE INSERT OR UPDATE
  ON club_trainer_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_club_trainer_invitation_transition();
