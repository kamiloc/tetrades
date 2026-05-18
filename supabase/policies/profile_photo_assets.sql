-- ============================================
-- Table:        profile_photo_assets
-- Apply with:   psql $DATABASE_URL -f supabase/policies/profile_photo_assets.sql
-- Tested in:    tests/rls/profile_photo_assets.test.ts
--
-- Data classification:
--   variant, width, height, athlete_id are L0-PUBLIC (the optimized variants
--   are served publicly via Supabase Storage). object_path is L1-INTERNAL
--   because the ORIGINAL variant's path points at an un-stripped file with
--   potentially sensitive EXIF metadata (GPS, device).
--
--   Per task 2.3 decisions, RLS keeps the row itself owner-scoped:
--   public-facing variant URLs are derived application-side from
--   athlete_public_profiles.avatar_asset_id, not from a direct SELECT on
--   profile_photo_assets by anonymous users.
--
-- Trust model:
--   Only the owning athlete may SELECT / INSERT / UPDATE / DELETE rows in
--   this table. The Next.js public profile page resolves avatar URLs via
--   service_role (tRPC server-side caller), so anon access is not required.
-- ============================================

ALTER TABLE public.profile_photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photo_assets FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      profile_photo_assets_select_own
-- Command:     SELECT
-- Role:        authenticated
-- Purpose:     An athlete can read their own photo asset rows.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY SELECT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profile_photo_assets_select_own"
  ON public.profile_photo_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = profile_photo_assets.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      profile_photo_assets_insert_own
-- Command:     INSERT
-- Role:        authenticated
-- Purpose:     An athlete can create photo asset rows for themselves.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY INSERT policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profile_photo_assets_insert_own"
  ON public.profile_photo_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = profile_photo_assets.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      profile_photo_assets_update_own
-- Command:     UPDATE
-- Role:        authenticated
-- Purpose:     An athlete can update their own photo asset rows (e.g., when
--              the optimizeImage job marks a row READY).
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY UPDATE policy on this table.
-- USING vs WITH CHECK: Identical — re-parenting to another athlete is
-- prevented by applying the predicate to both pre- and post-image.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profile_photo_assets_update_own"
  ON public.profile_photo_assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = profile_photo_assets.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = profile_photo_assets.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      profile_photo_assets_delete_own
-- Command:     DELETE
-- Role:        authenticated
-- Purpose:     An athlete can delete their own photo asset rows.
--              Note: athlete_public_profiles.avatar_asset_id has
--              onDelete: Restrict, so the application must clear the
--              avatar reference before deleting the asset.
-- NULL safety: athlete_id is NOT NULL.
-- Composition: ONLY DELETE policy on this table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profile_photo_assets_delete_own"
  ON public.profile_photo_assets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.user_accounts ua ON ua.id = a.user_account_id
      WHERE a.id = profile_photo_assets.athlete_id
        AND ua.supabase_user_id = auth.uid()::text
    )
  );
