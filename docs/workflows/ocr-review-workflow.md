# OCR Review Workflow

## State machine
`UPLOADED -> PROCESSING -> PENDING_REVIEW -> VERIFIED`

Human-only alternate end state:
`REJECTED`

## Processing rules
1. `processOCR` sets status to `PROCESSING` before calling Anthropic.
2. The raw model response is stored immutably in `ocrRawOutput`.
3. Parsed values are validated against the Zod medical schema.
4. Validated parsed data is stored in `ocrParsedData`.
5. Status transitions to `PENDING_REVIEW`.
6. If any step fails, status returns to `UPLOADED`.
7. Only `verifyDocument` may write `verifiedData` and transition to `VERIFIED`.

## Display rules
- UIs must never render `ocrParsedData` as canonical truth.
- UIs and protected APIs display only `verifiedData`.
- Confidence values are review guidance, never proof.
