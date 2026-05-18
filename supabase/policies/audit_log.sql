-- ============================================
-- Table:        audit_log              (Prisma model `AuditEvent` @@map("audit_log"))
-- Apply with:   psql $DATABASE_URL -f supabase/policies/audit_log.sql
-- Tested in:    tests/rls/audit_log.test.ts
--
-- Data classification:
--   All fields are L1-INTERNAL. Audit events themselves do NOT contain
--   decrypted PII — only metadata about access (actor, target, requestId,
--   purposeCode). The requestId column is the correlation key linking an
--   audit event back to the originating tRPC call (CLAUDE.md "Logging
--   Rules" + "Audit Logging for Decryption").
--
-- Trust model (per task 2.3 decision):
--   - SELECT: an athlete can read audit rows where THEY were the actor
--     (auth.uid() = actor's user_account.supabase_user_id). This is the
--     "transparency" surface: a user can review the actions they personally
--     triggered against PII / system state.
--     Note: this does NOT expose audit events targeting them as the subject
--     athlete; that surface, if needed, would be a separate athlete-scoped
--     policy that is intentionally not added here.
--   - INSERT: service_role only. The API server writes audit events via the
--     server-side Supabase client / Prisma.
--   - UPDATE: NO POLICY EXISTS. The audit_log is append-only.
--   - DELETE: NO POLICY EXISTS. Audit retention is 5 years (CLAUDE.md
--     "Retention & Legal Hold"); deletion is forbidden even for service_role
--     in the application layer.
-- ============================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      audit_log_select_own_actor
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Athletes can read audit events where they were the actor.
-- NULL safety: actor_user_account_id is NOT NULL (every audit event has an
--              actor; system jobs use the seeded SYSTEM_ACCOUNT user).
-- Composition: ONLY SELECT policy on this table. No permissive widening.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "audit_log_select_own_actor"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_accounts ua
      WHERE ua.id = audit_log.actor_user_account_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- INSERT: intentionally omitted. Only service_role writes audit events.
-- UPDATE: intentionally omitted AND must remain omitted. audit_log is
--         append-only by policy (CLAUDE.md "Audit Logging for Decryption").
-- DELETE: intentionally omitted AND must remain omitted. 5-year retention.
