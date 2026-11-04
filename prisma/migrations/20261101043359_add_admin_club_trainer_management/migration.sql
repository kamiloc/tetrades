-- CreateEnum
CREATE TYPE "trainer_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "admin_action" AS ENUM ('CLUB_CREATED', 'CLUB_UPDATED', 'CLUB_DEACTIVATED', 'CLUB_REACTIVATED', 'TRAINER_INVITED', 'TRAINER_INVITATION_REVOKED', 'TRAINER_REVOKED');

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "club_trainers" ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "deactivated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "club_trainer_invitations" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "trainer_invitation_status" NOT NULL DEFAULT 'PENDING',
    "invited_by_user_account_id" TEXT NOT NULL,
    "accepted_by_user_account_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "redacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_trainer_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_log" (
    "id" TEXT NOT NULL,
    "actor_user_account_id" TEXT NOT NULL,
    "action" "admin_action" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_trainer_invitations_club_id_status_idx" ON "club_trainer_invitations"("club_id", "status");

-- CreateIndex
CREATE INDEX "club_trainer_invitations_email_status_idx" ON "club_trainer_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "admin_action_log_actor_user_account_id_created_at_idx" ON "admin_action_log"("actor_user_account_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_action_log_target_type_target_id_idx" ON "admin_action_log"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "club_trainer_invitations" ADD CONSTRAINT "club_trainer_invitations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_trainer_invitations" ADD CONSTRAINT "club_trainer_invitations_invited_by_user_account_id_fkey" FOREIGN KEY ("invited_by_user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_trainer_invitations" ADD CONSTRAINT "club_trainer_invitations_accepted_by_user_account_id_fkey" FOREIGN KEY ("accepted_by_user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_log" ADD CONSTRAINT "admin_action_log_actor_user_account_id_fkey" FOREIGN KEY ("actor_user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
