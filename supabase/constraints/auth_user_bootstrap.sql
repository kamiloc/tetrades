-- ============================================================================
-- Auth user bootstrap trigger
--
-- Purpose:
--   Every row inserted into auth.users (Supabase Auth) automatically creates a
--   matching row in public.user_accounts so the application has an app-side
--   identity to bind data to. Without this, the first authenticated tRPC call
--   would race against the absence of a UserAccount row.
--
--   The Athlete row is NOT created here — Athlete requires displayName, sport,
--   country, and slug, which only the user can supply via the /onboarding
--   screen. The athlete.bootstrap tRPC mutation creates that row and flips
--   the UserAccount status from PENDING to ACTIVE.
--
-- Defaults:
--   role   = 'ATHLETE'   (all magic-link signups are athletes; SYSTEM accounts
--                         are created out-of-band by the project owner)
--   status = 'PENDING'   (transitions to ACTIVE on athlete bootstrap)
--
-- Idempotency:
--   ON CONFLICT (supabase_user_id) DO NOTHING — the trigger is safe to
--   re-fire (e.g., Supabase replays the INSERT during recovery) without
--   double-inserting.
--
-- Privileges:
--   SECURITY DEFINER so the function runs as the owner (postgres) and can
--   write to public.user_accounts even when RLS would otherwise deny it.
--   search_path is pinned to public to prevent search-path hijack attacks.
--
-- Application:
--   psql $DATABASE_URL -f supabase/constraints/auth_user_bootstrap.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_accounts (
    id,
    supabase_user_id,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    'ATHLETE'::user_role,
    'PENDING'::account_status,
    now(),
    now()
  )
  ON CONFLICT (supabase_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
