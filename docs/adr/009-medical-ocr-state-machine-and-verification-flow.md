# ADR-009: Medical OCR State Machine and Verification Flow

- **Status:** Superseded by [ADR-013](013-pivot-clubs-metrics-trainer-portal-and-visibility.md)
- **Superseded on:** 2026-10-03
- **Date:** 2026-04-02

> **Superseded.** The medical records and OCR domain was removed from the product. This ADR no longer applies to new work and is retained as a historical record. Code and policies that still implement it (`medical` router, `processOCR` job, `medical_documents` / `ocr_jobs` tables and RLS) are pending removal and must not be extended.

## Decision

OCR is a recoverable, non-canonical workflow whose outputs become authoritative only after human verification.

## State machine

`UPLOADED -> PROCESSING -> PENDING_REVIEW -> VERIFIED`

Human-only alternate state:
`REJECTED`

## Rules

- `rawOutputEnc` (on `OcrJob`) is immutable
- `parsedDataEnc` (on `OcrJob`) is not a display source of truth
- `verifiedDataEnc` (on `MedicalDocument`) is the only display source of truth
- only `verifyDocument` may write `verifiedDataEnc`
- `verifiedDataEnc` may be set only when `status = VERIFIED` (DB CHECK constraint)
- `processOCR` must copy `athleteId` from `MedicalDocument` into `OcrJob`
- `processOCR` must encrypt raw and parsed OCR outputs before persisting
- OCR failures revert to `UPLOADED`
- confidence scores are reviewer guidance only
