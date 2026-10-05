# Tasks

## 1. Confirmations and baseline

- [x] 1.1 Run `turbo typecheck && turbo test` and record the baseline; verify output is captured in the session
- [x] 1.2 Ask the user to confirm: removal of the `medical` router, deletion of RLS policy files/constraints, deletion of the listed test files, and that no production medical data exists; verify an explicit yes before continuing

## 2. Mobile and API surface

- [x] 2.1 Remove `apps/mobile/app/(app)/(tabs)/documents.tsx` and its `documents` entry in `(tabs)/_layout.tsx`; verify mobile typecheck passes and no `documents` route is referenced
- [x] 2.2 Remove `apps/api/src/router/medical.ts` and its mount in `router/index.ts`; verify `appRouter` typecheck passes in `apps/api`, `packages/api-client`, and both apps
- [x] 2.3 Reword OCR/medical comments in `middleware/rateLimit.ts` and `trpc.ts`; replace the `medical.uploadDocument` fixtures in `rate-limit.test.ts` with a neutral procedure name; verify `rate-limit.test.ts` passes

## 3. Queue, worker, and env

- [x] 3.1 Remove `processOCR.ts`, its worker registration in `queue/lifecycle.ts`, the `ocr-processing` queue (`queues.ts`), `QUEUE_NAMES.OCR_PROCESSING`, `OcrProcessingJobData`, the `index.ts` export, and the `DOCUMENT_*` notification types; verify `packages/queue` and `apps/api` typecheck
- [x] 3.2 Update `queue-infra.test.ts` and `queue-redis.int.test.ts` to drop OCR cases and delete `process-ocr.int.test.ts`; verify the remaining queue tests pass
- [x] 3.3 Remove `ANTHROPIC_API_KEY`, `WORKER_CONCURRENCY_OCR`, and the production key check from `apps/api/src/env.ts`, and the Anthropic section from `env.example` and `apps/api/.env.example`; verify API boots in a test env without those variables

## 4. RLS, constraints, and tests

- [x] 4.1 Delete `supabase/policies/{medical_documents,ocr_jobs}.sql`, `supabase/constraints/{medical_document_state_machine,ocr_job_immutability}.sql`, and `tests/rls/{medical_documents,ocr_jobs}.test.ts`; verify no file under `supabase/` or `tests/` references them
- [x] 4.2 Remove medical/OCR cleanup from `tests/rls/helpers/setup.ts`; change the `MEDICAL_DATA_UPLOAD` sample purpose in `pii_consent_log.test.ts`; verify the full `tests/rls` suite passes
- [x] 4.3 Reword the `crypto.test.ts` plaintext sample (`super-secret-medical-value-…`); verify crypto tests pass

## 5. Zod

- [x] 5.1 Delete `medical-document.ts`, `ocr-job.ts`; remove `documentStatusEnum`, `ocrJobStatusEnum`, the `index.ts` exports, and the `medical-documents` bucket value in `storage.ts`; verify validators typecheck and the storage router rejects the old bucket in a test
- [x] 5.2 Update `apps/api/src/__checks__/prisma-zod-bridge.ts` to drop medical/OCR assertions; verify the bridge check compiles

## 6. Prisma, seed, migration

- [x] 6.1 Remove `MedicalDocument`, `OcrJob`, their enums and relations from `schema.prisma`; run `prisma generate` and `prisma validate`; verify both succeed, then STOP and ask the user to run `prisma migrate dev --name remove-medical-ocr`
- [x] 6.2 Remove medical/OCR seeding and `deleteMany` calls from `prisma/seed.ts`; verify `prisma db seed` runs on a fresh DB (user-run) and the seed still yields at least 5 athletes
- [x] 6.3 After the user creates the migration, review its SQL drops only the two tables and two enums; verify by reading the generated file

## 7. Docs and final gate

- [x] 7.1 Remove `docs/workflows/ocr-review-workflow.md` and `document-upload-workflow.md` (or replace with a pointer to ADR-013); update the "Current state vs. target" section of `docs/project-architecture.md` and the ADR-009 banner; verify via grep that docs no longer describe medical code as present
- [x] 7.2 Run `turbo typecheck && turbo test && turbo lint` and `grep -rIni -E 'medical|ocr|OcrJob|MedicalDocument|anthropic'` excluding `docs/adr/009*`, `docs/adr/013*`, `openspec/`, `docs/design-handoff/`, and `prisma/migrations/`; verify all pass and the grep is empty
- [x] 7.3 Ask the user to delete the `medical-documents` bucket and the Anthropic key from deployed environments; verify the user confirms
