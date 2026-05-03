-- Enforce: verified_data_enc and verified_at can only be non-null when status is VERIFIED.
-- Applied after the initial Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/medical_document_state_machine.sql

ALTER TABLE medical_documents
  ADD CONSTRAINT chk_verified_requires_status
  CHECK (
    (status != 'VERIFIED' AND verified_data_enc IS NULL AND verified_at IS NULL)
    OR
    (status = 'VERIFIED' AND verified_data_enc IS NOT NULL AND verified_at IS NOT NULL)
  );

-- Enforce: verified_by_user_account_id must be set when VERIFIED, and only then.
ALTER TABLE medical_documents
  ADD CONSTRAINT chk_verified_requires_verifier
  CHECK (
    (status != 'VERIFIED' AND verified_by_user_account_id IS NULL)
    OR
    (status = 'VERIFIED' AND verified_by_user_account_id IS NOT NULL)
  );
