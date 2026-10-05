-- Hand-edited migration (design D3). Prisma cannot express a partial unique
-- index in schema.prisma; keeping it in migration history avoids drift.
-- Documented alongside the other constraints in
-- supabase/constraints/club_membership_open_unique.sql — keep both identical.
--
-- At most one open (PENDING_ATHLETE_CONFIRMATION or ACTIVE) membership per
-- (club, athlete). Terminal rows stay as history; re-invitation inserts a new row.

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_open_unique"
  ON "club_memberships" ("club_id", "athlete_id")
  WHERE "status" IN ('PENDING_ATHLETE_CONFIRMATION', 'ACTIVE');
