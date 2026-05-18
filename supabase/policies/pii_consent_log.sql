-- ============================================
-- Table:        pii_consent_log
-- Apply with:   psql $DATABASE_URL -f supabase/policies/pii_consent_log.sql
-- Tested in:    tests/rls/pii_consent_log.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. The table is the legal evidence trail for
--   Habeas Data consent (purpose code, version, granted, revoked).
--
-- Trust model (per task 2.3 decision):
--   service_role only — no application reads, no application writes.
--   - Consent grants and revocations are issued by the API server using
--     service_role inside the consent-flow tRPC procedures.
--   - Reads are reserved for: (a) data export under Habeas Data, (b)
--     compliance audits — both server-side operations.
--   - There is no scenario in which an end-user client should read or
--     mutate this table directly.
--
-- Implementation:
--   RLS is enabled and FORCED, and intentionally NO policies are granted to
--   anon or authenticated. With FORCE RLS + no matching policy, every
--   client-side SELECT / INSERT / UPDATE / DELETE returns zero rows or is
--   rejected. service_role bypasses RLS as designed.
-- ============================================

ALTER TABLE public.pii_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pii_consent_log FORCE ROW LEVEL SECURITY;

-- SELECT: intentionally omitted. service_role only.
-- INSERT: intentionally omitted. service_role only.
-- UPDATE: intentionally omitted. service_role only.
-- DELETE: intentionally omitted. service_role only — though deletion of
--         consent records is itself disallowed by retention policy
--         (CLAUDE.md "Retention & Legal Hold": 5-year minimum).
