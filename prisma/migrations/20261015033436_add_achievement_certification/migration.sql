-- CreateEnum
CREATE TYPE "certification_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "achievement_certification_requests" (
    "id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "club_membership_id" TEXT NOT NULL,
    "status" "certification_request_status" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_club_trainer_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "rejection_reason" TEXT,

    CONSTRAINT "achievement_certification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "achievement_certification_requests_club_id_status_requested_idx" ON "achievement_certification_requests"("club_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "achievement_certification_requests_club_membership_id_statu_idx" ON "achievement_certification_requests"("club_membership_id", "status");

-- CreateIndex
CREATE INDEX "achievement_certification_requests_achievement_id_idx" ON "achievement_certification_requests"("achievement_id");

-- AddForeignKey
ALTER TABLE "achievement_certification_requests" ADD CONSTRAINT "achievement_certification_requests_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "athlete_achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_certification_requests" ADD CONSTRAINT "achievement_certification_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_certification_requests" ADD CONSTRAINT "achievement_certification_requests_club_membership_id_fkey" FOREIGN KEY ("club_membership_id") REFERENCES "club_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_certification_requests" ADD CONSTRAINT "achievement_certification_requests_decided_by_club_trainer_fkey" FOREIGN KEY ("decided_by_club_trainer_id") REFERENCES "club_trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One open request per achievement (supabase/constraints/achievement_certification_open_unique.sql).
CREATE UNIQUE INDEX achievement_certification_requests_open_unique
  ON achievement_certification_requests (achievement_id)
  WHERE status = 'PENDING';

-- PENDING now means "an open request exists"; earlier PENDING rows had none.
UPDATE athlete_achievements SET verification_status = 'UNVERIFIED'
  WHERE verification_status = 'PENDING';