-- ============================================
-- Storage buckets for profile photos (ADR-015)
-- Apply with:   psql $DATABASE_URL -f supabase/storage/buckets.sql
-- Idempotent: re-running converges both buckets to these settings.
--
--   profile-photos           PUBLIC. Only the EXIF-stripped WebP variants
--                            written by the image-optimization worker (L0).
--                            Layout: {athleteId}/{issuedAtMs}-{nonce}/{thumb-150|card-400|full-1200}.webp
--   profile-photo-originals  PRIVATE. Athlete uploads, which may carry EXIF
--                            (GPS, device) — L1-INTERNAL. Reached only through
--                            server-issued signed URLs (storageRouter).
--                            Layout: {athleteId}/{issuedAtMs}-{nonce}.{jpg|png|webp}
--
-- No storage.objects policies are defined. Public variants are anonymously
-- readable through the public-bucket endpoint; anon/authenticated cannot
-- list, upload, or delete in either bucket, and cannot read originals at
-- all. Uploads and private reads go only through server-issued signed URLs.
-- ============================================

-- Preflight (ADR-015 Rollout). Aborts before any setting changes when:
--   1. profile-photos holds anything other than versioned variants. The
--      pre-ADR-015 layout stored originals there; making the bucket public
--      would expose them.
--   2. profile_photo_assets still has pre-ADR-015 rows (bucket-prefixed
--      paths), which would resolve to broken URLs under the new layout.
DO $$
DECLARE
  stray_objects bigint;
  legacy_rows bigint;
BEGIN
  SELECT count(*) INTO stray_objects
  FROM storage.objects
  WHERE bucket_id = 'profile-photos'
    AND name !~ '^[^/]+/[0-9]{13}-[0-9a-f]{16}/(thumb-150|card-400|full-1200)\.webp$';
  IF stray_objects > 0 THEN
    RAISE EXCEPTION
      'profile-photos holds % object(s) outside the variant layout; move originals to profile-photo-originals before making it public',
      stray_objects;
  END IF;

  IF to_regclass('public.profile_photo_assets') IS NOT NULL THEN
    SELECT count(*) INTO legacy_rows
    FROM public.profile_photo_assets
    WHERE object_path LIKE 'profile-photos/%';
    IF legacy_rows > 0 THEN
      RAISE EXCEPTION
        'profile_photo_assets has % row(s) with pre-ADR-015 paths; reseed or rewrite them to bucket-relative paths first',
        legacy_rows;
    END IF;
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', true, 2097152, ARRAY['image/webp']),
  ('profile-photo-originals', 'profile-photo-originals', false, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
