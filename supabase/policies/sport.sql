-- ============================================
-- Table:        sports                (Prisma model `Sport` @@map("sports"))
-- Apply with:   psql $DATABASE_URL -f supabase/policies/sport.sql
-- Tested in:    tests/rls/sport.test.ts
--
-- Data classification:
--   All fields are L0-PUBLIC. This is a controlled lookup table populated by
--   seed / service_role; clients only read it.
--
-- Trust model:
--   Anonymous and authenticated users may read all rows (for dropdowns,
--   search facets, public profiles).
--   Mutations are service_role only — no INSERT / UPDATE / DELETE policies.
-- ============================================

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      sport_select_public
-- Command:     SELECT
-- Role:        anon, authenticated
-- Purpose:     Sports are a public taxonomy; expose them to every reader.
-- NULL safety: No nullable predicates — the policy is unconditionally TRUE.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "sport_select_public"
  ON public.sports
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- INSERT / UPDATE / DELETE: intentionally omitted. Catalog mutations are
-- service_role operations (seed scripts or admin tooling).
