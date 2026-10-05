# Proposal

## Why

The product pivot (ADR-013) removes medical records and OCR. The docs and ERM already reflect this, but `prisma/schema.prisma`, the validators, the API, the queue, RLS, tests, and the mobile app still implement the medical/OCR pipeline. Leaving it creates dead L2 surface (encrypted medical payloads, an Anthropic API key, a `medical-documents` bucket) that contradicts the documented data model and must keep passing audits and RLS tests for no product value.

## What Changes

- **BREAKING** Remove the `MedicalDocument` and `OcrJob` models and the `DocumentStatus` / `OcrJobStatus` enums from the Prisma schema, including their relations on `Athlete` and `UserAccount`.
- **BREAKING** Remove the `medical` tRPC router and its mount in `appRouter`.
- Remove the Zod schemas and enums for medical documents and OCR jobs, and the `medical-documents` value of the storage bucket enum.
- Remove the `processOCR` worker, the `ocr-processing` queue, `OcrProcessingJobData`, and the `DOCUMENT_VERIFIED` / `DOCUMENT_REJECTED` notification types.
- Remove `ANTHROPIC_API_KEY` and `WORKER_CONCURRENCY_OCR` from API env validation and from both `.env.example` files.
- Remove RLS policies, DB constraints, and RLS/integration tests for `medical_documents` and `ocr_jobs`; remove their cleanup from test setup and seed.
- Remove the mobile Documents tab.
- Remove medical/OCR content from remaining docs (`docs/workflows/*`) and update `docs/project-architecture.md` once the code matches.
- Add a DB migration (user-run) dropping the tables and enums, and a deployment step to delete the `medical-documents` Storage bucket.

## Capabilities

### New Capabilities
- `sensitive-data-scope`: Defines which data the platform stores as L2-CONFIDENTIAL (identity PII only) and states that medical documents and OCR processing are not part of the product.

### Modified Capabilities

(none — `openspec/specs/` is empty)

## Impact

- **Code:** `prisma/schema.prisma`, `prisma/seed.ts`, `packages/validators`, `packages/queue`, `apps/api` (router, jobs, queue lifecycle, env, rate-limit comments, tests), `apps/mobile` (tabs), `tests/rls`, `supabase/policies`, `supabase/constraints`.
- **Infra:** Postgres migration; Supabase Storage bucket `medical-documents`; Anthropic key no longer needed.
- **Approvals needed (AGENTS.md):** removing a router, deleting RLS policies, deleting test files, and running migrations each require explicit user confirmation during apply.
- **Follow-on:** `add-clubs-metrics-visibility-model` is independent of this change and may land in either order.
