-- Prevent overwriting raw_output_enc once set. raw_output_enc is the immutable audit
-- trail of OCR extraction (per ADR-003) and must never be modified after first write.
-- Applied after the initial Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/ocr_job_immutability.sql

CREATE OR REPLACE FUNCTION prevent_raw_output_overwrite()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.raw_output_enc IS NOT NULL AND NEW.raw_output_enc IS DISTINCT FROM OLD.raw_output_enc THEN
    RAISE EXCEPTION 'raw_output_enc is immutable once set and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_raw_output_overwrite ON ocr_jobs;
CREATE TRIGGER trg_prevent_raw_output_overwrite
  BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_raw_output_overwrite();
