-- ============================================
-- Table:        admin_action_log       (Prisma model `AdminActionLog`)
-- Apply with:   psql $DATABASE_URL -f supabase/policies/admin_action_log.sql
-- Tested in:    tests/rls/admin_action_log.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. `metadata` holds ids, counts and changed
--   field NAMES only — never an email, a field value, or L2 data.
--
-- Trust model (ADR-017, design D6/D8):
--   - Append-only record of every successful admin write, inserted by the API
--     in the same transaction as the write.
--   - NO client policies exist, for any command, and every table privilege is
--     revoked from anon and authenticated. No client — an admin included —
--     can read, insert, update or delete a row directly.
--   - Admins read the log only through the admin API (`admin.listActions`,
--     add-web-admin-insights), which re-checks the admin role on every call,
--     reads through the API's connection, and never returns `request_id` or
--     the actor's internal ids. That read path adds no policy or grant here.
--   - The API writes through its Prisma connection. Checked fact, recorded
--     2026-11-01 on the DATABASE_URL connection (Supabase pooler):
--       SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;
--       → postgres | true
--     so FORCE RLS with no policy does not block the API's inserts. If that
--     role ever loses BYPASSRLS, admin writes fail closed (the insert is
--     rejected and the whole admin transaction rolls back).
--   - `audit_log` is unchanged: it requires a non-null athlete_id, and admin
--     actions have no subject athlete.
--   - Retention: 5 years, like audit_log. The purge job joins the tombstone
--     purge follow-up.
--
-- Policies:     none.
--   SELECT:     0 policies — clients read nothing. NULL safety: n/a.
--   INSERT:     0 policies — only the API's connection inserts.
--   UPDATE:     0 policies — append-only.
--   DELETE:     0 policies — append-only.
-- ============================================

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_action_log FROM anon, authenticated;
