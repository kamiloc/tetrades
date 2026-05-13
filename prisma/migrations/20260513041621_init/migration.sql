-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ATHLETE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "profile_status" AS ENUM ('DRAFT', 'ACTIVE', 'HIDDEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('NOT_STARTED', 'IDENTITY_PENDING', 'CONSENT_PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('UPLOADED', 'PROCESSING', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ocr_job_status" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "connection_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "photo_variant" AS ENUM ('ORIGINAL', 'THUMB_150', 'CARD_400', 'FULL_1200');

-- CreateEnum
CREATE TYPE "processing_status" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "data_lifecycle_type" AS ENUM ('EXPORT', 'DELETION', 'RECTIFICATION');

-- CreateEnum
CREATE TYPE "data_lifecycle_status" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED_LEGAL_HOLD', 'FAILED');

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL,
    "supabase_user_id" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "account_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "user_account_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "sport_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "profile_status" "profile_status" NOT NULL DEFAULT 'DRAFT',
    "is_under_legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_public_profiles" (
    "athlete_id" TEXT NOT NULL,
    "public_bio" TEXT,
    "city" TEXT,
    "primary_position" TEXT,
    "connection_count_cache" INTEGER NOT NULL DEFAULT 0,
    "avatar_asset_id" TEXT,
    "is_searchable" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_public_profiles_pkey" PRIMARY KEY ("athlete_id")
);

-- CreateTable
CREATE TABLE "athlete_private_profiles" (
    "athlete_id" TEXT NOT NULL,
    "exact_dob_enc" BYTEA,
    "contact_email_enc" BYTEA,
    "contact_phone_enc" BYTEA,
    "gov_id_enc" BYTEA,
    "encryption_key_version" TEXT NOT NULL,
    "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_private_profiles_pkey" PRIMARY KEY ("athlete_id")
);

-- CreateTable
CREATE TABLE "profile_photo_assets" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "variant" "photo_variant" NOT NULL,
    "object_path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "processing_status" "processing_status" NOT NULL DEFAULT 'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photo_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_achievements" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "achieved_on" DATE NOT NULL,
    "verification_status" "verification_status" NOT NULL DEFAULT 'UNVERIFIED',
    "verification_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_connections" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "addressee_id" TEXT NOT NULL,
    "status" "connection_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "athlete_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "document_type_enc" BYTEA NOT NULL,
    "object_path_enc" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'UPLOADED',
    "verified_data_enc" BYTEA,
    "verified_by_user_account_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_jobs" (
    "id" TEXT NOT NULL,
    "medical_document_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "status" "ocr_job_status" NOT NULL DEFAULT 'QUEUED',
    "raw_output_enc" BYTEA,
    "parsed_data_enc" BYTEA,
    "confidence_map" JSONB,
    "schema_valid" BOOLEAN NOT NULL DEFAULT false,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "request_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pii_consent_log" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "purpose_code" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "evidence_ref" TEXT,

    CONSTRAINT "pii_consent_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_account_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "purpose_code" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_lifecycle_requests" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "request_type" "data_lifecycle_type" NOT NULL,
    "status" "data_lifecycle_status" NOT NULL DEFAULT 'REQUESTED',
    "artifact_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "data_lifecycle_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_supabase_user_id_key" ON "user_accounts"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sports_name_key" ON "sports"("name");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_user_account_id_key" ON "athletes"("user_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_slug_key" ON "athletes"("slug");

-- CreateIndex
CREATE INDEX "athletes_sport_id_profile_status_idx" ON "athletes"("sport_id", "profile_status");

-- CreateIndex
CREATE INDEX "athletes_country_code_sport_id_idx" ON "athletes"("country_code", "sport_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_public_profiles_avatar_asset_id_key" ON "athlete_public_profiles"("avatar_asset_id");

-- CreateIndex
CREATE INDEX "athlete_public_profiles_is_searchable_idx" ON "athlete_public_profiles"("is_searchable");

-- CreateIndex
CREATE UNIQUE INDEX "profile_photo_assets_athlete_id_variant_key" ON "profile_photo_assets"("athlete_id", "variant");

-- CreateIndex
CREATE INDEX "athlete_achievements_athlete_id_verification_status_idx" ON "athlete_achievements"("athlete_id", "verification_status");

-- CreateIndex
CREATE INDEX "athlete_connections_requester_id_status_idx" ON "athlete_connections"("requester_id", "status");

-- CreateIndex
CREATE INDEX "athlete_connections_addressee_id_status_idx" ON "athlete_connections"("addressee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_connections_requester_id_addressee_id_key" ON "athlete_connections"("requester_id", "addressee_id");

-- CreateIndex
CREATE INDEX "medical_documents_athlete_id_status_idx" ON "medical_documents"("athlete_id", "status");

-- CreateIndex
CREATE INDEX "medical_documents_verified_by_user_account_id_idx" ON "medical_documents"("verified_by_user_account_id");

-- CreateIndex
CREATE INDEX "ocr_jobs_medical_document_id_status_idx" ON "ocr_jobs"("medical_document_id", "status");

-- CreateIndex
CREATE INDEX "ocr_jobs_athlete_id_idx" ON "ocr_jobs"("athlete_id");

-- CreateIndex
CREATE INDEX "ocr_jobs_request_id_idx" ON "ocr_jobs"("request_id");

-- CreateIndex
CREATE INDEX "pii_consent_log_athlete_id_purpose_code_idx" ON "pii_consent_log"("athlete_id", "purpose_code");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_account_id_created_at_idx" ON "audit_log"("actor_user_account_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_athlete_id_created_at_idx" ON "audit_log"("athlete_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_event_type_created_at_idx" ON "audit_log"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "data_lifecycle_requests_athlete_id_status_idx" ON "data_lifecycle_requests"("athlete_id", "status");

-- CreateIndex
CREATE INDEX "data_lifecycle_requests_status_created_at_idx" ON "data_lifecycle_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_public_profiles" ADD CONSTRAINT "athlete_public_profiles_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_public_profiles" ADD CONSTRAINT "athlete_public_profiles_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "profile_photo_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_private_profiles" ADD CONSTRAINT "athlete_private_profiles_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_photo_assets" ADD CONSTRAINT "profile_photo_assets_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_achievements" ADD CONSTRAINT "athlete_achievements_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_connections" ADD CONSTRAINT "athlete_connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_connections" ADD CONSTRAINT "athlete_connections_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_verified_by_user_account_id_fkey" FOREIGN KEY ("verified_by_user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_medical_document_id_fkey" FOREIGN KEY ("medical_document_id") REFERENCES "medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pii_consent_log" ADD CONSTRAINT "pii_consent_log_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_account_id_fkey" FOREIGN KEY ("actor_user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_requests" ADD CONSTRAINT "data_lifecycle_requests_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_lifecycle_requests" ADD CONSTRAINT "data_lifecycle_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
