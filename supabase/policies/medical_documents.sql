-- ============================================
-- Table:        medical_documents
-- Apply with:   psql $DATABASE_URL -f supabase/policies/medical_documents.sql
-- Tested in:    tests/rls/medical_documents.test.ts
--
-- Data classification:
--   Contains L2-CONFIDENTIAL encrypted payloads (documentTypeEnc,
--   objectPathEnc, verifiedDataEnc) plus L1-INTERNAL workflow metadata
--   (status, sha256, mimeType, verifiedByUserAccountId).
--
--   Encryption protects the values at rest; RLS keeps the rows from being
--   addressable to anyone other than the owning athlete or an assigned
--   verifier.
--
-- Trust model:
--   - SELECT: the owning athlete OR the assigned verifier (the user_account
--     pointed to by verified_by_user_account_id, when not NULL).
--   - INSERT: the owning athlete (athletes upload their own documents).
--   - UPDATE: the owning athlete (uploads / re-uploads) OR the assigned
--     verifier (state-machine transitions to VERIFIED / REJECTED). Allowed
--     transitions are additionally enforced by
--     supabase/constraints/medical_document_state_machine.sql.
--   - DELETE: the owning athlete (the deletePII service_role flow also
--     deletes via service_role for Habeas Data compliance).
-- ============================================

ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      medical_documents_select_owner_or_verifier
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     The owning athlete and the assigned verifier may read the row.
-- NULL safety: verified_by_user_account_id IS nullable — the verifier branch
--              is guarded by an explicit IS NOT NULL test so an unassigned
--              row never matches every authenticated user.
-- Composition: ONLY SELECT policy on this table; the owner / verifier
--              disjunction is contained inside a single predicate so no
--              separate permissive policy can widen visibility.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "medical_documents_select_owner_or_verifier"
  ON public.medical_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = medical_documents.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
    OR (
      medical_documents.verified_by_user_account_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_accounts ua
        WHERE ua.id = medical_documents.verified_by_user_account_id
          AND ua.supabase_user_id = auth.uid()::text
      )
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      medical_documents_insert_owner
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     Only the owning athlete can create new medical_documents rows.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "medical_documents_insert_owner"
  ON public.medical_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = medical_documents.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      medical_documents_update_owner_or_verifier
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     Owning athlete can re-upload / withdraw; assigned verifier
--              can move the row through VERIFIED / REJECTED.
-- NULL safety: verified_by_user_account_id IS NOT NULL gate on the verifier
--              branch (same as SELECT).
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK:
--   USING gates which rows the caller can touch (must be owner OR current
--   verifier on the pre-image).
--   WITH CHECK requires the post-image to still belong to the same athlete.
--   The branches differ ONLY in that WITH CHECK omits the verifier path —
--   this is intentional: a verifier can mutate a row they are already
--   assigned to, but they cannot re-parent it to a different athlete.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "medical_documents_update_owner_or_verifier"
  ON public.medical_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = medical_documents.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
    OR (
      medical_documents.verified_by_user_account_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_accounts ua
        WHERE ua.id = medical_documents.verified_by_user_account_id
          AND ua.supabase_user_id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = medical_documents.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
    OR (
      medical_documents.verified_by_user_account_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_accounts ua
        WHERE ua.id = medical_documents.verified_by_user_account_id
          AND ua.supabase_user_id = auth.uid()::text
      )
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      medical_documents_delete_owner
-- Command:     DELETE
-- Role:        authenticated
-- Purpose:     The owning athlete can delete their own medical documents.
--              (Habeas Data deletion cascades execute under service_role.)
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY DELETE policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "medical_documents_delete_owner"
  ON public.medical_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = medical_documents.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
