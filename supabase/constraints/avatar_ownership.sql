-- Ensure avatar references belong to the same athlete and are not ORIGINAL
-- This is applied after the initial Prisma migration via:
--   psql $DATABASE_URL -f supabase/constraints/avatar_ownership.sql

CREATE OR REPLACE FUNCTION check_avatar_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.avatar_asset_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profile_photo_assets
      WHERE id = NEW.avatar_asset_id
        AND athlete_id = NEW.athlete_id
        AND variant != 'ORIGINAL'
    ) THEN
      RAISE EXCEPTION 'Avatar must belong to the same athlete and cannot be ORIGINAL variant';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_avatar_ownership ON athlete_public_profiles;
CREATE TRIGGER trg_check_avatar_ownership
  BEFORE INSERT OR UPDATE OF avatar_asset_id
  ON athlete_public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_avatar_ownership();
