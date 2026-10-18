-- DropForeignKey
ALTER TABLE "achievement_certification_requests" DROP CONSTRAINT "achievement_certification_requests_achievement_id_fkey";

-- AddForeignKey
ALTER TABLE "achievement_certification_requests" ADD CONSTRAINT "achievement_certification_requests_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "athlete_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
