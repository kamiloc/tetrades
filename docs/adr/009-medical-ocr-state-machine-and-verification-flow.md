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
- `ocrRawOutput` is immutable
- `ocrParsedData` is not a display source of truth
- `verifiedData` is the only display source of truth
- only `verifyDocument` may write `verifiedData`
- OCR failures revert to `UPLOADED`
- confidence scores are reviewer guidance only
