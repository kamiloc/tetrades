/*
  Warnings:

  - You are about to drop the `medical_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ocr_jobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "medical_documents" DROP CONSTRAINT "medical_documents_athlete_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_documents" DROP CONSTRAINT "medical_documents_verified_by_user_account_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_athlete_id_fkey";

-- DropForeignKey
ALTER TABLE "ocr_jobs" DROP CONSTRAINT "ocr_jobs_medical_document_id_fkey";

-- DropTable
DROP TABLE "medical_documents";

-- DropTable
DROP TABLE "ocr_jobs";

-- DropEnum
DROP TYPE "document_status";

-- DropEnum
DROP TYPE "ocr_job_status";
