# Design

## Context

The medical/OCR pipeline spans Prisma models (`MedicalDocument`, `OcrJob`), Zod (`medical-document.ts`, `ocr-job.ts`, enums, `storageBucketSchema`), the `medical` router, the `processOCR` worker plus `ocr-processing` queue in `@packages/queue`, API env (`ANTHROPIC_API_KEY`, `WORKER_CONCURRENCY_OCR`), SQL policies/constraints, RLS and integration tests, seed data, and the mobile Documents tab. ADR-009 is superseded; ADR-013 forbids extending any of it. Rules from AGENTS.md apply: Zod before Prisma, same-PR removal, user-run migrations, confirmation before deleting routers, RLS policies, or tests.

## Goals / Non-Goals

**Goals:**
- Code, schema, and infra match the documented post-pivot model.
- Leave `typecheck`, `test`, and `lint` green after each task group.

**Non-Goals:**
- Introducing club, metric, or visibility entities (separate change).
- Rewriting `deletePII` beyond removing medical references.
- Touching `docs/design-handoff/`.

## Decisions

1. **Remove top-down, consumers before definitions.** Order: mobile tab → router and rate-limit references → queue/worker/env → tests and policies → Zod → Prisma → seed/migration. *Alternative:* delete the models first and fix compile errors; rejected because it leaves long red stretches and hides leftover references.
2. **Zod first, Prisma last.** Per ADR-002 the Zod schemas go before the Prisma models; the CI bridge check (`prisma-zod-bridge.ts`) is updated in the same step so it never references a deleted type.
3. **One destructive migration, user-run.** The migration drops `ocr_jobs`, `medical_documents`, and enums `document_status` / `ocr_job_status`. The agent edits `schema.prisma`, runs `prisma generate` and `prisma validate`, then stops and asks the user to run `prisma migrate dev` (AGENTS.md). *Alternative:* soft-deprecate tables; rejected, since keeping encrypted medical columns defeats the goal.
4. **Existing migrations are not edited.** The `init` migration stays as history; removal is a new migration.
5. **Constraints and policies deleted with their tables.** `supabase/policies/{medical_documents,ocr_jobs}.sql` and `supabase/constraints/{medical_document_state_machine,ocr_job_immutability}.sql` are applied/dropped alongside the migration; tables drop their own policies, but the SQL files must be removed so they are not reapplied.
6. **Notification types.** `DOCUMENT_VERIFIED` / `DOCUMENT_REJECTED` are removed from the notification payload union; `sendNotification` stays for connection events.
7. **`pii_consent_log` purpose code.** RLS tests use the sample purpose `MEDICAL_DATA_UPLOAD`; replace with a non-medical sample code. No schema change (purpose is free text).
8. **Rate limiter.** The `sensitive` tier and its empty procedure set remain (future upload endpoints); only OCR/medical wording and the `medical.uploadDocument` test fixtures change to a neutral procedure name.

## Risks / Trade-offs

- [Irreversible data loss if any non-seed medical data exists] → Assumption: pre-launch, seed data only. Confirm with the user before the migration; take a DB backup if not.
- [Storage bucket deletion is a Supabase configuration change] → Requires explicit confirmation; list objects first.
- [Deleting test files / RLS policies / a router needs confirmation] → Ask once up front at apply start, listing exact files.
- [Dangling references in comments/docs] → Final grep gate for `medical|ocr|OcrJob|MedicalDocument|ANTHROPIC` outside `docs/adr/009`, `openspec/`, and `docs/design-handoff/`.
- [Mobile tab removal changes navigation] → Check `_layout.tsx` and any deep links to `documents`.

## Migration Plan

1. Land code removal (tasks 1–5), all checks green.
2. Edit `schema.prisma`; `prisma generate`/`validate`; stop for user to run the migration locally.
3. Run migration in staging, then production, after backup confirmation.
4. Delete the `medical-documents` bucket and the Anthropic key from deployed envs.
Rollback: restore from backup; the code change is revertable via git, the migration is not reversible without backup.
