-- ============================================
-- Table:        clubs                 (Prisma model `Club` @@map("clubs"))
-- Apply with:   psql $DATABASE_URL -f supabase/policies/clubs.sql
-- Tested in:    tests/rls/clubs.test.ts
--
-- Data classification:
--   id, slug, name, country_code, city are L0-PUBLIC; created_at is L1 but
--   carries no athlete data. Clubs are provisioned by seed / service_role.
--
-- Trust model:
--   Anonymous and authenticated users may read all rows (public club pages,
--   membership display). Mutations are service_role only — no INSERT /
--   UPDATE / DELETE policies (ADR-013: no self-serve club provisioning).
-- ============================================

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      clubs_select_public
-- Command:     SELECT
-- Role:        anon, authenticated
-- Purpose:     Clubs are public reference data.
-- NULL safety: No nullable predicates — the policy is unconditionally TRUE.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "clubs_select_public"
  ON public.clubs
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- INSERT / UPDATE / DELETE: intentionally omitted. Club provisioning is a
-- service_role operation (seed scripts or direct DB access).
