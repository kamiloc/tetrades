-- ============================================
-- Table:        clubs                 (Prisma model `Club` @@map("clubs"))
-- Apply with:   psql $DATABASE_URL -f supabase/policies/clubs.sql
--               Apply this file BEFORE club_memberships.sql,
--               athlete_metric_entries.sql, achievement_certification_requests.sql
--               and supabase/constraints/athlete_metric_entry_active_membership.sql:
--               they call public.club_is_active().
-- Tested in:    tests/rls/clubs.test.ts
--
-- Data classification:
--   id, slug, name, country_code, city are L0-PUBLIC. deactivated_at and
--   created_at are L1-INTERNAL (ADR-017).
--
-- Trust model:
--   - Rows: anonymous and authenticated users may read every row (public club
--     pages, membership display). Deactivated clubs stay readable; outputs
--     label them through the API's derived `isActive`.
--   - Columns: client roles may SELECT only the five L0 columns. The table-wide
--     SELECT grant is revoked and replaced with a column list, so
--     deactivated_at and created_at are unreadable to anon and authenticated
--     (a `select *` from a client fails with a permission error). The API's
--     own connection (postgres) and service_role are unaffected.
--   - Mutations are service_role / API only — no INSERT / UPDATE / DELETE
--     policies. Admins create, edit, deactivate and reactivate clubs through
--     the API's admin router (ADR-017); clubs are never deleted.
--   - Policies on other tables decide "is this club active?" through
--     public.club_is_active(), because they run with the caller's privileges
--     and cannot read deactivated_at.
-- ============================================

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs FORCE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Policy:      clubs_select_public
-- Command:     SELECT
-- Role:        anon, authenticated
-- Purpose:     Clubs are public reference data. Which columns are readable is
--              limited by the column grants below, not by this policy.
-- NULL safety: No nullable predicates — the policy is unconditionally TRUE.
-- Composition: ONLY SELECT policy on this table. No OR-composition risk.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clubs_select_public" ON public.clubs;
CREATE POLICY "clubs_select_public"
  ON public.clubs
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- INSERT / UPDATE / DELETE: intentionally omitted. Club writes go through the
-- API (admin router) on its own connection.

-- ────────────────────────────────────────────────────────────────────────────
-- Column grants (ADR-017, design D6)
-- Purpose:     Client roles read the L0 columns only. Other privileges are
--              left as Supabase grants them; without a write policy, FORCE RLS
--              denies every client write regardless.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.clubs FROM anon, authenticated;
GRANT SELECT (id, slug, name, country_code, city) ON public.clubs TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Function:    public.club_is_active(club_id text) RETURNS boolean
-- Purpose:     Lets policies and triggers on other tables check that a club is
--              active without reading deactivated_at under the caller's
--              privileges.
-- Security:    STABLE SECURITY DEFINER with a pinned search_path and no
--              dynamic SQL (same pattern as handle_new_auth_user). It returns
--              one boolean for the given id and reveals nothing else: for any
--              id, it says only whether an active club with that id exists.
-- NULL safety: A NULL or unknown id returns FALSE (EXISTS over no rows).
-- Grants:      EXECUTE to authenticated (policies and the metric-entry trigger
--              run as the caller) and service_role (the trigger also runs for
--              service-role writes). Revoked from PUBLIC and anon.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.club_is_active(club_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = club_is_active.club_id
      AND c.deactivated_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.club_is_active(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_is_active(text) TO authenticated, service_role;
