-- One capacity per account (add-admin-club-trainer-management, design D12;
-- ADR-017). An account is at most one of:
--   - an athlete  (has an athletes row),
--   - a trainer   (has club_trainers rows, active or revoked),
--   - an admin    (user_accounts.role = 'ADMIN').
-- A person who needs two capacities uses two accounts with two emails.
--
-- Enforced for every writer, including service_role and the API:
--   - club_trainers: reject a row for an account that has an athletes row or
--     whose role is not ATHLETE (ADMIN and SYSTEM accounts are never trainers).
--     Trainer accounts keep role ATHLETE: there is no TRAINER role.
--   - athletes: reject a row for an account that has any club_trainers row or
--     whose role is not ATHLETE.
-- Both fire on INSERT and on any UPDATE that moves the row to another account.
--
-- Concurrency: each check first locks the account's user_accounts row
-- (SELECT ... FOR UPDATE), so two concurrent inserts for the same account —
-- one athlete, one trainer — serialize, and the second sees the first.
--
-- Privileges: SECURITY DEFINER with a pinned search_path, so the check reads
-- every row regardless of the writer's RLS view (an invoker-rights check
-- could miss a row it cannot see and pass). No dynamic SQL.
--
-- Not covered here: changing user_accounts.role. Only the project owner sets
-- role = 'ADMIN', by SQL, on a dedicated account (ADR-017 runbook).
--
-- Before applying, confirm no account already holds both capacities:
--   SELECT ct.user_account_id
--   FROM club_trainers ct JOIN athletes a ON a.user_account_id = ct.user_account_id;
-- Expected: zero rows.
--   SELECT ct.user_account_id
--   FROM club_trainers ct JOIN user_accounts ua ON ua.id = ct.user_account_id
--   WHERE ua.role <> 'ATHLETE';
-- Expected: zero rows.
--
-- Applied after the add_admin_club_trainer_management Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/account_single_capacity.sql
-- Tested in: tests/rls/club_trainers.test.ts, tests/rls/athletes.test.ts

CREATE OR REPLACE FUNCTION public.check_club_trainer_single_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_account_id = OLD.user_account_id THEN
    RETURN NEW;
  END IF;

  SELECT ua.role::text INTO account_role
  FROM public.user_accounts ua
  WHERE ua.id = NEW.user_account_id
  FOR UPDATE;

  -- A missing account is left to the foreign key, which rejects it.
  IF account_role IS NOT NULL AND account_role <> 'ATHLETE' THEN
    RAISE EXCEPTION 'Only an ATHLETE-role account can be a club trainer';
  END IF;

  IF EXISTS (SELECT 1 FROM public.athletes a WHERE a.user_account_id = NEW.user_account_id) THEN
    RAISE EXCEPTION 'An athlete account cannot be a club trainer';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_athlete_single_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_account_id = OLD.user_account_id THEN
    RETURN NEW;
  END IF;

  SELECT ua.role::text INTO account_role
  FROM public.user_accounts ua
  WHERE ua.id = NEW.user_account_id
  FOR UPDATE;

  IF account_role IS NOT NULL AND account_role <> 'ATHLETE' THEN
    RAISE EXCEPTION 'Only an ATHLETE account can have an athlete profile';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.club_trainers ct WHERE ct.user_account_id = NEW.user_account_id
  ) THEN
    RAISE EXCEPTION 'A club trainer account cannot have an athlete profile';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions are never called directly.
REVOKE ALL ON FUNCTION public.check_club_trainer_single_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_athlete_single_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_club_trainer_single_capacity ON public.club_trainers;
CREATE TRIGGER trg_check_club_trainer_single_capacity
  BEFORE INSERT OR UPDATE OF user_account_id
  ON public.club_trainers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_club_trainer_single_capacity();

DROP TRIGGER IF EXISTS trg_check_athlete_single_capacity ON public.athletes;
CREATE TRIGGER trg_check_athlete_single_capacity
  BEFORE INSERT OR UPDATE OF user_account_id
  ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_athlete_single_capacity();
