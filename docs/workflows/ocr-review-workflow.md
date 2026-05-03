# OCR Review Workflow

## State machine

`UPLOADED -> PROCESSING -> PENDING_REVIEW -> VERIFIED`

Human-only alternate end state:
`REJECTED`

## Processing rules

1. `processOCR` sets status to `PROCESSING` before calling Anthropic.
2. `processOCR` copies `athleteId` from `MedicalDocument` into `OcrJob`.
3. The raw model response is encrypted and stored immutably in `rawOutputEnc`.
4. Parsed values are validated against the Zod medical schema.
5. Validated parsed data is encrypted and stored in `parsedDataEnc`.
6. Status transitions to `PENDING_REVIEW`.
7. If any step fails, status returns to `UPLOADED`.
8. Only `verifyDocument` may write `verifiedDataEnc` and transition to `VERIFIED` (DB CHECK constraint enforces this).

## Display rules

- UIs must never render `parsedDataEnc` as canonical truth.
- UIs and protected APIs display only `verifiedDataEnc`.
- Confidence values are review guidance, never proof.
