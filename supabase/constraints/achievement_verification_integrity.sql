-- Only the certification flow may change an achievement's verification state
-- (add-achievement-certification, design D2; achievement-certification spec,
-- "Only certification changes verification status").
--
-- RLS cannot restrict columns, so the owner-only INSERT/UPDATE policies on
-- athlete_achievements would otherwise let an athlete mark their own row
-- VERIFIED. This trigger applies only to end users, i.e. requests that
-- reach Postgres through PostgREST with a JWT whose role is anon or
-- authenticated:
--   INSERT → verification_status must be UNVERIFIED, verification_source NULL
--   UPDATE → verification_status / verification_source cannot change, except
--            that editing title, organization, or achieved_on of a VERIFIED
--            row resets it to UNVERIFIED (the edit is kept). Those facts
--            cannot be edited while the row is PENDING: a trainer is
--            reviewing them, so the athlete must withdraw the request first.
-- The API connects through Prisma without a JWT (auth.role() is NULL), so the
-- certification service can still write the status; keying on the JWT role
-- avoids a "trusted writer" flag a client could spoof.
-- Applied after the add_achievement_certification Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/achievement_verification_integrity.sql
CREATE OR REPLACE FUNCTION check_achievement_verification_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status <> 'UNVERIFIED' OR NEW.verification_source IS NOT NULL THEN
      RAISE EXCEPTION 'A new achievement must start UNVERIFIED with no verification source';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.verification_source IS DISTINCT FROM OLD.verification_source THEN
    RAISE EXCEPTION 'Verification source can only be changed by the certification flow';
  END IF;

  IF OLD.verification_status = 'PENDING'
     AND (NEW.title IS DISTINCT FROM OLD.title
          OR NEW.organization IS DISTINCT FROM OLD.organization
          OR NEW.achieved_on IS DISTINCT FROM OLD.achieved_on) THEN
    -- A trainer must never approve facts they did not review.
    RAISE EXCEPTION 'Withdraw the certification request before editing this achievement';
  END IF;

  IF OLD.verification_status = 'VERIFIED'
     AND (NEW.title IS DISTINCT FROM OLD.title
          OR NEW.organization IS DISTINCT FROM OLD.organization
          OR NEW.achieved_on IS DISTINCT FROM OLD.achieved_on) THEN
    -- The certified facts changed, so the certification no longer applies.
    -- The caller may leave the status as is or reset it themselves; any
    -- other status is rejected below.
    IF NEW.verification_status NOT IN ('VERIFIED', 'UNVERIFIED') THEN
      RAISE EXCEPTION 'Verification status can only be changed by the certification flow';
    END IF;
    NEW.verification_status := 'UNVERIFIED';
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Verification status can only be changed by the certification flow';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_achievement_verification_integrity ON athlete_achievements;
CREATE TRIGGER trg_check_achievement_verification_integrity
  BEFORE INSERT OR UPDATE
  ON athlete_achievements
  FOR EACH ROW
  EXECUTE FUNCTION check_achievement_verification_integrity();
