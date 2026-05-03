# ADR-009: Medical OCR State Machine and Verification Flow

- **Status:** Accepted
- **Date:** 2026-04-02

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
