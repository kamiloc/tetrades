-- ============================================
-- Table:        club_trainer_invitations (Prisma model `ClubTrainerInvitation`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/club_trainer_invitations.sql
-- Tested in:    tests/rls/club_trainer_invitations.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. `email` is personal data with a bounded
--   lifetime: the trainer-invitation-redaction job replaces it with
--   `redacted:<id>` 90 days after the invitation ends, and deletePII redacts
--   invitations addressed to a deleted athlete (ADR-017, D13/D14).
--
-- Trust model (ADR-017, design D2/D4/D6):
--   - NO client policies exist, for any command, and every table privilege is
--     revoked from anon and authenticated. With FORCE RLS and no policy, a
--     client query returns zero rows and every client write is denied, the
--     invitee included.
--   - Only the API reads and writes invitations, on its own connection
--     (postgres, rolbypassrls = true). The admin router creates and revokes
--     them; the trainerInvitation router lets the invitee list, accept and
--     decline them.
--   - Why no invitee SELECT policy: such a policy could only match the JWT
--     `email` claim, and the presence of that claim does not prove the
--     address was verified. The API instead matches the session email only
--     when Supabase reports it confirmed (`email_confirmed_at` set,
--     @packages/auth verifyAccessToken), compared lowercased.
--   - Trust assumption (D2): a confirmed email proves inbox ownership. With
--     Magic Link and OTP as the only sign-in methods, confirmation happens by
--     completing the link or code. The project keeps Supabase "Confirm email"
--     and "Secure email change" on, but the API's email_confirmed_at check
--     holds even if a user is created unconfirmed or a setting is turned off.
--   - Lifecycle and immutability: supabase/constraints/club_trainer_invitation_transitions.sql.
--     One PENDING row per (club, lower(email)) plus the lowercase CHECK:
--     supabase/constraints/club_trainer_invitation_open_unique.sql (in the
--     migration).
--
-- Policies:     none.
--   SELECT:     0 policies — clients read nothing. NULL safety: n/a.
--   INSERT:     0 policies — clients insert nothing.
--   UPDATE:     0 policies — clients update nothing.
--   DELETE:     0 policies — rows are never deleted by clients; deletePII
--               redacts instead of deleting.
-- ============================================

ALTER TABLE public.club_trainer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_trainer_invitations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.club_trainer_invitations FROM anon, authenticated;
