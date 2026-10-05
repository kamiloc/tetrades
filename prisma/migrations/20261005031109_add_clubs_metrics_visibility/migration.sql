-- CreateEnum
CREATE TYPE "club_membership_status" AS ENUM ('PENDING_ATHLETE_CONFIRMATION', 'ACTIVE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "visibility_audience" AS ENUM ('PRIVATE', 'CONNECTIONS', 'PUBLIC');

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_trainers" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "user_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "status" "club_membership_status" NOT NULL DEFAULT 'PENDING_ATHLETE_CONFIRMATION',
    "invited_by_club_trainer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sport_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_metric_entries" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "metric_definition_id" TEXT NOT NULL,
    "club_membership_id" TEXT NOT NULL,
    "reported_by_club_trainer_id" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_metric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_metric_summaries" (
    "athlete_id" TEXT NOT NULL,
    "metric_definition_id" TEXT NOT NULL,
    "latest_value" DECIMAL(12,4) NOT NULL,
    "latest_measured_at" TIMESTAMP(3) NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_metric_summaries_pkey" PRIMARY KEY ("athlete_id","metric_definition_id")
);

-- CreateTable
CREATE TABLE "athlete_visibility_settings" (
    "athlete_id" TEXT NOT NULL,
    "club_memberships_audience" "visibility_audience" NOT NULL DEFAULT 'PRIVATE',
    "metrics_audience" "visibility_audience" NOT NULL DEFAULT 'PRIVATE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_visibility_settings_pkey" PRIMARY KEY ("athlete_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE INDEX "club_trainers_user_account_id_idx" ON "club_trainers"("user_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_trainers_club_id_user_account_id_key" ON "club_trainers"("club_id", "user_account_id");

-- CreateIndex
CREATE INDEX "club_memberships_club_id_athlete_id_status_idx" ON "club_memberships"("club_id", "athlete_id", "status");

-- CreateIndex
CREATE INDEX "club_memberships_athlete_id_status_idx" ON "club_memberships"("athlete_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_key_key" ON "metric_definitions"("key");

-- CreateIndex
CREATE INDEX "athlete_metric_entries_athlete_id_metric_definition_id_meas_idx" ON "athlete_metric_entries"("athlete_id", "metric_definition_id", "measured_at");

-- CreateIndex
CREATE INDEX "athlete_metric_entries_club_membership_id_idx" ON "athlete_metric_entries"("club_membership_id");

-- AddForeignKey
ALTER TABLE "club_trainers" ADD CONSTRAINT "club_trainers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_trainers" ADD CONSTRAINT "club_trainers_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_invited_by_club_trainer_id_fkey" FOREIGN KEY ("invited_by_club_trainer_id") REFERENCES "club_trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_entries" ADD CONSTRAINT "athlete_metric_entries_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_entries" ADD CONSTRAINT "athlete_metric_entries_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_entries" ADD CONSTRAINT "athlete_metric_entries_club_membership_id_fkey" FOREIGN KEY ("club_membership_id") REFERENCES "club_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_entries" ADD CONSTRAINT "athlete_metric_entries_reported_by_club_trainer_id_fkey" FOREIGN KEY ("reported_by_club_trainer_id") REFERENCES "club_trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_summaries" ADD CONSTRAINT "athlete_metric_summaries_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_metric_summaries" ADD CONSTRAINT "athlete_metric_summaries_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_visibility_settings" ADD CONSTRAINT "athlete_visibility_settings_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
