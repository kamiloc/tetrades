-- ============================================
-- Table:        ocr_jobs
-- Apply with:   psql $DATABASE_URL -f supabase/policies/ocr_jobs.sql
-- Tested in:    tests/rls/ocr_jobs.test.ts
--
-- Data classification:
--   Contains L2-CONFIDENTIAL encrypted payloads (rawOutputEnc, parsedDataEnc)
--   plus L1-INTERNAL metadata (status, retryCount, requestId, confidenceMap).
--   The requestId column ties an OCR job to the originating tRPC call for
--   audit traceability (CLAUDE.md "Logging Rules").
--
-- ADR-008 constraint (NON-NEGOTIABLE):
--   ocr_jobs MUST use a direct predicate on its denormalized athlete_id
--   column. Join-based RLS on medical_documents is forbidden for this table.
--   This is why the schema carries athlete_id on ocr_jobs in addition to
--   medical_document_id (see prisma/schema.prisma line ~386).
--
--   As a consequence: the verifier of the related medical_documents row is
--   NOT granted SELECT here via RLS — verifier access to OCR output is
--   served by the API server using service_role, gated by the
--   medical_documents verifier predicate at the application layer.
--
-- Trust model:
--   - SELECT: owning athlete only (direct athlete_id predicate).
--   - INSERT / UPDATE / DELETE: service_role only. Background workers (the
--     processOCR job) own writes to this table — no client-side mutation is
--     allowed even for the owning athlete.
-- ============================================

ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_jobs FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      ocr_jobs_select_owner_direct
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     Owning athlete reads their own OCR jobs via the denormalized
--              athlete_id column. No join to medical_documents (ADR-008).
-- NULL safety: ocr_jobs.athlete_id is NOT NULL (denormalized FK, enforced by
--              the application layer on INSERT to mirror
--              medical_documents.athlete_id).
-- Composition: ONLY SELECT policy on this table. No permissive widening risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "ocr_jobs_select_owner_direct"
  ON public.ocr_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = ocr_jobs.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- INSERT / UPDATE / DELETE: intentionally omitted. Job lifecycle is owned by
-- the BullMQ worker layer running with service_role credentials. Allowing
-- client-side INSERT would also bypass the ocr_job_immutability constraint
-- on rawOutputEnc (see supabase/constraints/ocr_job_immutability.sql).
