-- ============================================
-- Storage buckets for profile photos (ADR-015)
-- Apply with:   psql $DATABASE_URL -f supabase/storage/buckets.sql
-- Idempotent: re-running converges both buckets to these settings.
--
--   profile-photos           PUBLIC. Only the EXIF-stripped WebP variants
--                            written by the image-optimization worker (L0).
--                            Layout: {athleteId}/{issuedAtMs}/{thumb-150|card-400|full-1200}.webp
--   profile-photo-originals  PRIVATE. Athlete uploads, which may carry EXIF
--                            (GPS, device) — L1-INTERNAL. Reached only through
--                            server-issued signed URLs (storageRouter).
--                            Layout: {athleteId}/{issuedAtMs}.{jpg|png|webp}
--
-- No storage.objects policies are defined: anon/authenticated get no direct
-- object access in either bucket. Uploads and private reads go through
-- signed URLs; public variants are served by the public-bucket endpoint.
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', true, 2097152, ARRAY['image/webp']),
  ('profile-photo-originals', 'profile-photo-originals', false, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
