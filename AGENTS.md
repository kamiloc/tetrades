# AGENTS.md — Athlete Social Network (The Athlete Passport)

> **This file is the single source of truth for all AI agents (Claude Code, Codex) working in this repository.**
> Read it in its entirety before writing any code. Every rule here exists because its violation was observed in practice.
> `CLAUDE.md` is a one-line stub (`@AGENTS.md`) so Claude Code loads this file; never put rules there.
> Section titles are cited by code comments and RLS policy headers — do not rename them.

## Project overview

**Product:** A LinkedIn-style social network for athletes: public sporting identity, verified achievements, club affiliation, and trainer-reported sport metrics, with athlete-controlled visibility.
**Regulatory context:** Colombian Habeas Data (Ley 1581 de 2012). Designed for future GDPR compliance.
**Development model:** ~90% AI-agent generated code. Architecture is intentionally rigid and type-safe to prevent agent hallucination.
**Language:** TypeScript (strict mode, no `any`).
**Domain pivot:** Medical records and OCR have been removed from the product. Clubs, sport metrics, the trainer portal, and visibility controls are governed by `docs/adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md`. Read it before touching any of those areas.

## Read order before coding

1. This file
2. `docs/adr/README.md` (and ADR-013 for pivot work)
3. `docs/project-architecture.md`
4. `docs/data-classification.md`
5. `docs/pii-access-matrix.md`
6. The package or app `README.md` for the folder you are changing

## Stack reference

| Layer            | Technology                        | Location                   |
| ---------------- | --------------------------------- | -------------------------- |
| Orchestration    | Turborepo                         | Root `turbo.json`          |
| Public Web (SEO) | Next.js 14+ (App Router)          | `apps/web/`                |
| Mobile App       | Expo + React Native (expo-router) | `apps/mobile/`             |
| Backend API      | Fastify + tRPC v11                | `apps/api/`                |
| Database         | PostgreSQL via Supabase           | `prisma/schema.prisma`     |
| ORM              | Prisma                            | `apps/api/`                |
| Validation       | Zod                               | `packages/validators/`     |
| Auth             | Supabase Auth (Magic Link + OTP)  | `packages/auth/`           |
| Encryption       | node:crypto AES-256-GCM           | `packages/crypto/`         |
| Storage          | Supabase Storage (signed URLs)    | Via `storageRouter` in API |
| Background jobs  | BullMQ + Redis                    | `packages/queue/`          |
| Styling (Web)    | Tailwind CSS                      | `apps/web/`                |
| Styling (Mobile) | NativeWind                        | `apps/mobile/`             |

The directory tree is authoritative over any list in this file. Layout conventions: one tRPC router file per domain in `apps/api/src/router/` merged in `router/index.ts`; business logic in `apps/api/src/services/`; BullMQ workers in `apps/api/src/jobs/`; one RLS SQL file per table in `supabase/policies/`; RLS tests in `tests/rls/`; crypto tests in `tests/crypto/`; ADRs in `docs/adr/`.

## Data classification

Every field in every model belongs to exactly one classification level. When in doubt, classify UP.

| Level  | Label          | Examples                                                                                              | Storage rule                                                                             | Logging rule                                                                |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **L0** | `PUBLIC`       | Athlete name, sport, public bio, verified achievements, connection count, club names, metric catalog | Plaintext. Served via public API and SSR.                                                | May appear in logs.                                                         |
| **L1** | `INTERNAL`     | Email address, account timestamps, device tokens, membership state, metric entries                    | Plaintext. Accessible only to the owning athlete, authorized parties (see below), system services. | May appear in structured logs, NEVER in error messages returned to clients. |
| **L2** | `CONFIDENTIAL` | Government ID, exact date of birth, contact email/phone                                               | Encrypted at rest via `@packages/crypto` (`*_enc` columns).                              | NEVER logged at any level. Decryption requires an audit event.              |
| **L3** | `RESTRICTED`   | Master encryption keys, Supabase service-role keys, third-party API keys                              | Environment variables only. Never in source, seed files, `.env.example`, or CI logs.     | NEVER logged. NEVER passed as function arguments outside `@packages/crypto`. |

**Classification is not visibility.** Classification (L0–L3) describes storage sensitivity and handling. Visibility (`AthleteVisibilitySettings`, see ADR-013) describes which audience may see a field the athlete owns. A field can be L1 and still be shown to a chosen audience; an L0 field is not automatically visible to everyone. Never use one to substitute for the other.

### Classification rules

- EVERY new Prisma field MUST carry its level in a doc comment (`/// L1-INTERNAL`).
- EVERY Zod schema in `@packages/validators` MUST mirror these classifications. L2 fields are NEVER included in public-facing output schemas.
- Profile photo originals are L1-INTERNAL (EXIF may contain GPS, device info, timestamps). Public variants are L0-PUBLIC after optimization.
- The `optimizeImage` job MUST strip all EXIF metadata before generating public variants.

## Absolute rules (never violate)

### 1. TypeScript strictness

- Never use `any` (use `unknown` and narrow), `@ts-ignore`, `@ts-expect-error`, or non-null assertions (`!`).
- Keep `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax` enabled.

### 2. Package boundaries

- Packages never import from `apps/`. Apps never import from each other.
- Shared imports come from `@packages/*` only.
- No `react-native` import inside `packages/`. The only React import allowed in packages is `react` (core) inside `@packages/auth/src/hooks.ts` and `@packages/api-client/src/hooks.ts`.
- Never create a component that imports from both `react-native` and `react` (DOM). UI is app-specific.
- If a task requires a cross-boundary import, STOP and ask.

| Package / App            | May import from                                                                                                      | Exports                                                                           | Never do                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `@packages/validators`   | `zod` only                                                                                                           | Zod schemas, inferred TS types                                                    | Import from any other package or app                                              |
| `@packages/shared-logic` | Standard library only (`Intl`, `Date`)                                                                               | Pure functions, constants, enums                                                  | Import React, Zod, Prisma, or any package                                         |
| `@packages/auth`         | `@supabase/supabase-js`, `@supabase/ssr`, `react` (hooks.ts ONLY)                                                    | `useAuth`, `useSession`, `useSignIn`, `useSignOut`, `verifyToken`, `createClient` | Import from `react-native`, `expo-*`, or any app                                  |
| `@packages/crypto`       | `node:crypto` only                                                                                                   | `encryptPII()`, `decryptPII()` — nothing else                                     | Export internal helpers, import any external crypto lib                           |
| `@packages/api-client`   | `@trpc/react-query`, `@trpc/client`, `@packages/validators`                                                          | Typed tRPC hooks, client config                                                   | Contain business logic, call Prisma, import from apps                             |
| `@packages/queue`        | `bullmq`, `ioredis`                                                                                                  | Queue instances, typed job payloads                                               | Contain job execution logic (workers live in `apps/api/src/jobs/`)               |
| `@app/api`               | Any `@packages/*`, `@prisma/client`, `fastify`, `@trpc/server`                                                       | tRPC router type (for client inference)                                           | Import from `react`, `react-native`, `apps/web`, `apps/mobile`                    |
| `@app/web`               | `@packages/validators`, `@packages/api-client`, `@packages/auth`, `@packages/shared-logic`, `next`, `react`          | Nothing (leaf app)                                                                | Import from `react-native`, `expo-*`, `apps/mobile`, `apps/api` (use tRPC caller) |
| `@app/mobile`            | `@packages/validators`, `@packages/api-client`, `@packages/auth`, `@packages/shared-logic`, `expo-*`, `react-native` | Nothing (leaf app)                                                                | Import from `react-dom`, `next`, `apps/web`, `apps/api`                           |

`@packages/auth` MAY import `react` only in `hooks.ts` (core API: `useState`, `useEffect`, `useContext`). `client.ts` and `server.ts` are pure TypeScript.

### 3. UI sharing policy

- UI components belong only in their app: `apps/web/components/` or `apps/mobile/components/`.
- Shared packages may only export validators, typed API hooks, pure TS utilities, auth wrappers, crypto functions, and job types.
- Never install Solito, `@expo/next-adapter`, or any UI bridge layer.

### 4. State management

- Never add Zustand, Redux, Jotai, Recoil, MobX, or any global state library.
- Server state flows through tRPC + TanStack Query. Local UI state uses `useState` or `useReducer`.
- Invalidate query caches instead of inventing global state.

## Contract chain (Zod → tRPC → Prisma)

- Zod is the source of truth. All schemas live in `packages/validators`; none inside `apps/`.
- Every tRPC procedure uses `.input()` and `.output()` with schemas imported from `@packages/validators`. Never define inline Zod schemas in procedures.
- Add a field to Zod FIRST, then Prisma. Remove a field from both in the same PR.
- A CI check asserts Prisma-generated types are compatible with Zod-inferred types.
- Naming: base `fooSchema`; inputs `createFooInput` / `updateFooInput` (from `.pick()` / `.partial().pick()`); public outputs `fooPublicProfile` (from `.omit()`, no L2); inferred types via `z.infer`.
- Prisma ids use `cuidSchema` in input schemas, not `uuid`.

## Database — Prisma rules

- Always use `select`, never `include`.
- Never use `$queryRaw` unless the user explicitly approves it.
- Never return raw Prisma records to clients; shape outputs explicitly.
- If `schema.prisma` changes: update Zod first, run `prisma generate`, run `prisma validate`, then STOP and tell the user: "Schema modified. Run `prisma migrate dev --name <name>` to create the migration."
- Never run `prisma migrate dev` or `prisma migrate reset` on the user's behalf. Never modify `schema.prisma` and create a migration in the same session without user review.
- Seed data (`prisma/seed.ts`) uses realistic Colombian athlete data: proper names, real sports, plausible measurements, at least 5 athletes across different sports with complete profiles. Never `John Doe`, `test@test.com`, or lorem ipsum.

## tRPC rules

- Every procedure uses `publicProcedure` or `protectedProcedure`; never the base procedure.
- Procedure shape: auth level → `.input()` → `.output()` → implementation with explicit `select`.
- Use `TRPCError` for all errors, with user-facing messages. Never throw raw `Error`; never include stack traces, internal IDs, SQL errors, or Prisma details in messages.
  - `NOT_FOUND`: resource doesn't exist. `FORBIDDEN`: authenticated but not authorized. `BAD_REQUEST`: invalid beyond Zod. `INTERNAL_SERVER_ERROR`: unexpected failure.
- Use `superjson` as the transformer and `httpBatchLink` on clients.
- In Next.js Server Components, use `createCallerFactory`; do not call your own HTTP API.
- Never expose internal ids (Supabase user id, internal foreign keys) from public procedures. Exception: the athlete's own cuid (`athleteId`) is an accepted public identifier and may be returned.
- One router file per domain; the root router in `router/index.ts` merges all of them. Never add a router file without updating the merge.
- Extract business logic into service functions once a procedure exceeds ~10 lines.
- **List endpoints enforce the same visibility and authorization filtering as detail endpoints** (ADR-013). A list procedure that skips the filter applied by its detail counterpart is a defect.

## Auth rules

- App code goes through `@packages/auth`; never call Supabase auth APIs directly from apps.
- The auth middleware (`apps/api/src/middleware/auth.ts`) verifies the JWT and attaches `userId` to the tRPC context. Trust only `ctx.userId`; never client-supplied user ids.
- Magic Link is primary auth, OTP fallback. No email/password auth.
- Use Supabase-managed sessions; never store tokens in `localStorage`. Do not implement custom refresh rotation.
- Expo tokens live in `expo-secure-store`. Next.js sessions use httpOnly cookies via Supabase SSR helpers.

### Break-Glass Access Policy

There is NO admin or support role that can read another athlete's L2-CONFIDENTIAL data through the application. If support access is required (legal compliance, law enforcement request, critical bug investigation):

1. Access goes through a direct database query using the Supabase service-role key.
2. The query is logged in `audit_log` with actor (support person's email), action `BREAK_GLASS_ACCESS`, target (athleteId + table + field), a mandatory non-empty justification, and a requestId linking to the support ticket.
3. The project owner (Cristian) approves BEFORE execution.
4. Never build break-glass in the application layer. It is a database-level operation, not an API endpoint.
5. Agents MUST NOT create any tRPC procedure, middleware, or role that grants cross-tenant access to L2-CONFIDENTIAL data. No exceptions. This explicitly includes trainer and club roles (ADR-013).

## Encryption rules

- `@packages/crypto` exports EXACTLY `encryptPII()` and `decryptPII()`. Nothing else.
- Use `node:crypto` AES-256-GCM (envelope encryption) only. No libsodium, tweetnacl, or other third-party crypto.
- Never store keys in source, `.env.example`, seed files, or test fixtures.
- Never log plaintext, ciphertext, or keys. Never put PII in URL query strings; use POST bodies.
- Only backend/server contexts may decrypt PII.
- L2 fields requiring encryption: government ID, exact date of birth, contact email, contact phone, and any future personal identification number.

### Audit Logging for Decryption

Every `decryptPII()` call MUST emit an audit event. This is enforced inside `@packages/crypto`: `decryptPII(payload, masterKey, auditContext)` calls an internal `emitDecryptionAudit()` before returning plaintext. The event contains:

- actor: `ctx.userId`
- action: `DECRYPT_PII`
- target: `{ table, recordId, field }`
- purpose: string (e.g. `athlete_viewed_own_profile`, `data_export`) — always required
- requestId: from tRPC context
- timestamp: ISO 8601

Never bypass the audit by calling `node:crypto` directly. `audit_log` is append-only: athletes may SELECT their own records (`auth.uid() = actor`), INSERT is service_role only, and no UPDATE or DELETE policy exists. Audit events are L1-INTERNAL (metadata only, never decrypted values).

## RLS rules (highest hallucination risk)

- Put every policy in `supabase/policies/<table>.sql`, one file per table. Never place RLS inside Prisma migrations or application code.
- Every policy file enables AND forces RLS (`ENABLE` + `FORCE ROW LEVEL SECURITY`).
- Every policy has a header: table, policy name (`[table]_[command]_[role]`), command, role, purpose, NULL safety (can the FK be NULL, and the consequence), composition (how many policies of this command exist), and the test file in `tests/rls/`.
- Every policy has a Vitest test in `tests/rls/` proving (a) intended access is allowed, (b) cross-tenant access is denied using two distinct user ids, (c) NULL foreign keys are handled.
- Never combine `USING` and `WITH CHECK` in one policy unless a comment explains why they differ.
- Consider PostgreSQL OR-composition: an overly broad permissive policy defeats every other policy of the same command.
- Never modify an existing policy without running the full `tests/rls/` suite. Never delete or broaden a policy without explicit user confirmation.
- Never modify `audit_log` schema or policies without confirmation.

## Pivot domain rules (clubs, metrics, trainers, visibility)

Authoritative detail lives in ADR-013. The invariants every agent must hold:

- Medical records and OCR no longer exist in the product. Do not add medical, diagnosis, medication, doctor, clinic, or OCR concepts back.
- Trainers never read or write `AthletePrivateProfile` or any L2 field.
- Trainer-reported metric entries are accepted only for athletes with an `ACTIVE` `ClubMembership` to that trainer's club. `PENDING_ATHLETE_CONFIRMATION` grants no write access.
- A club cannot associate an athlete without the athlete's confirmation.
- Visibility filtering is enforced in every endpoint that returns athlete data, list and detail alike, and in RLS where a table is directly readable.

## Background jobs (BullMQ) rules

- Job payloads are typed in `packages/queue/src/types.ts`, serializable (no functions, class instances, or Buffers), and MUST include `requestId` for correlation from tRPC call → enqueue → execution → completion/failure.
- Every job has a typed payload, max retries (default 3), exponential backoff, and error handling that moves related DB records to a recoverable state.
- Persist the triggering data BEFORE enqueueing.
- Never run CPU-intensive work (image optimization, encryption) inside a tRPC procedure; enqueue a job. Workers live in `apps/api/src/jobs/`.
- Worker logs include the payload's `requestId`.

## Storage and image rules

- Generate signed URLs only through `storageRouter`, never on the client. Maximum expiry is 15 minutes.
- Upload flow: client requests a signed upload URL (`storageRouter.getUploadUrl`) → uploads directly to Supabase Storage → confirms (`storageRouter.confirmUpload`) → server enqueues the background job.
- Never accept uploads through Fastify (no multipart).
- Bucket `profile-photos/` (public for optimized variants only):
  - `{athleteId}/original.{ext}` — L1-INTERNAL, never served publicly; signed URL through `storageRouter` for authenticated access only
  - `{athleteId}/thumb-150.webp`, `card-400.webp`, `full-1200.webp` — L0-PUBLIC
- Use `sharp` only (never jimp, canvas, ImageMagick). Generate exactly 3 variants: 150×150 (WebP q80), 400×400 (q85), 1200×1200 (q90), `fit: 'cover'`.
- Strip EXIF from every variant: `sharp(input).withMetadata(false).resize(...).webp(...)`.
- Image optimization runs in the `optimizeImage` job, never in a procedure.

## Web rules (Next.js)

- App Router only; never create `pages/`.
- Public athlete pages (`/athlete/[slug]`) are Server Components (no `'use client'`) with ISR `revalidate: 3600`.
- Server-side data fetching uses tRPC `createCallerFactory`, never HTTP self-calls.
- Every public page implements `generateMetadata()`: title, description, Open Graph, Twitter card, JSON-LD (Person + Athlete), canonical URL.
- Public pages expose only what the athlete's visibility settings allow among L0-PUBLIC fields: sport, bio, verified achievements, optimized photo variants, connection count, and club or metric data where the athlete made it public. Never L1/L2 data.
- `/sitemap.xml` is dynamic and includes only public, searchable athlete profiles.
- Use `next/image` with Supabase `images.remotePatterns` configured in `next.config.js`.

## Mobile rules (Expo)

- Use `expo-router` only; never install `react-navigation` directly or `react-native-web`.
- Use NativeWind for new components (no new `StyleSheet.create`; existing code may keep it).
- Tokens live in `expo-secure-store`, never AsyncStorage.
- Configure the Magic Link deep link in `app.json` under `scheme`.
- Use `expo-image-picker` for photo intake and `expo-notifications` for push.

## Testing rules

- Vitest only. Co-locate `*.test.ts` with source, or use `tests/` for cross-cutting suites.
- Required: unit tests (Zod schemas, pure functions, encryption round-trips), integration tests for every procedure, RLS tests for every policy, audit tests proving `decryptPII()` emits an event on every call.
- Every procedure needs success, invalid-input (Zod), 401 (protected procedures), and 404 coverage.
- For pivot tables, RLS deny-tests are mandatory for `Club`, `ClubMembership`, and `AthleteMetricEntry`, including a test proving a trainer cannot write a metric entry for an athlete whose membership is `PENDING_ATHLETE_CONFIRMATION`.
- Never mock Prisma in integration tests; use a test database with seed data.
- Never skip or comment out failing tests; fix them or report them.
- E2E tests are deferred to Sprint 7+.
- Run `turbo typecheck && turbo test && turbo lint` before handoff.

## Logging Rules

- Use Pino / Fastify logger. No `console.log` in production code (acceptable only in seed scripts and one-off dev utilities).
- Levels: `info` (request received, job started/completed), `warn` (retry, rate limit approached, deprecation), `error` (unhandled exception, job permanently failed, external API error).
- Always include `requestId` in log context.
- Never log L2 or L3 data, tokens, passwords, or decrypted plaintext.
- L1 data (email, device token) may appear in structured logs but NEVER in error messages returned to clients.

## Retention & Legal Hold

Habeas Data grants athletes the right to deletion; legal obligations may require temporary retention.

- Active athlete data: retained while the account is active.
- Deleted athlete data: hard-deleted within 30 days of the request (including Storage files and encrypted fields).
- Audit log and `pii_consent_log`: retained 5 years after creation.
- Legal hold is the `isUnderLegalHold` flag on `athletes`. When true, the `deletePII` job MUST abort and log a warning ("Deletion blocked by legal hold"), and the athlete is told the deletion is paused due to a legal obligation (without disclosing the reason unless required by law).
- Only the project owner (Cristian) sets or clears a hold, via direct database access. Agents MUST NOT create any procedure that sets or clears a legal hold.
- After `deletePII` completes, a verification query checks every table with a foreign key to the athlete and confirms zero rows, and confirms Storage holds zero files under `{athleteId}/`. On failure, the job transitions to `FAILED` and alerts the project owner.

## Habeas Data compliance checklist

- [ ] Classification level assigned to every field in every model
- [ ] `pii_consent_log` records consent with timestamp and purpose code
- [ ] Data export endpoint generates a complete ZIP of all athlete data
- [ ] Data deletion cascades through ALL tables and Storage, including club memberships and metric entries
- [ ] Post-deletion verification confirms zero residual records
- [ ] Legal hold check blocks deletion of held data
- [ ] Audit log captures every `decryptPII()` call with actor, purpose, and target
- [ ] Privacy policy is linked from the registration flow
- [ ] All L2 fields are encrypted at rest via `@packages/crypto`
- [ ] Profile photo originals have EXIF stripped before public variants exist
- [ ] RLS policies prevent cross-tenant access (verified by deny-tests)
- [ ] Audit log is append-only
- [ ] Retention periods are enforced by scheduled jobs, not ad-hoc deletion
- [ ] Break-glass access is database-only, pre-approved, and audit-logged

## Dependency rules

- Ask for user approval before adding a package; state its name and reason. Check whether an existing dependency covers the need first.
- Preferred choices: native `fetch` (not axios/got/node-fetch), `date-fns` (not moment/dayjs/luxon), `sharp`, `node:crypto` (no bcrypt/argon2), cuid via Prisma `@default(cuid())` (no uuid/nanoid), Zod (no yup/joi), Vitest (no Jest/mocha).

## Performance rules

- Always paginate lists with cursor + `take`; default 20, max 50. No offset pagination on large sets.
- Avoid sequential DB calls when a single explicit nested `select` can do the work.
- Do not call external APIs directly from tRPC procedures; enqueue jobs.
- Respect the 10-connection DB budget in `DATABASE_URL`; discuss pooling before raising it.

## Git and commit conventions

- Branches: `feat/`, `fix/`, `chore/`, `refactor/` prefixes (e.g. `feat/club-membership`).
- Conventional Commits (e.g. `fix(rls): handle NULL athlete_id in club_memberships policy`).
- Never commit directly to `main`; use a feature branch and PR.
- Never commit `.env` files, API keys, or secrets; verify `.gitignore`.
- Run `turbo typecheck && turbo test && turbo lint` before pushing.

## Agent protocol

### Before starting

1. Read this file fully.
2. Run `turbo typecheck`.
3. Identify the sprint/task.
4. List files you expect to change and check them against the package contracts.

### During work

5. Do not modify `schema.prisma` without user approval; do not run `prisma migrate dev`.
6. Keep changes within the correct app/package.
7. Run `turbo test` after completing the task.
8. Use `select`, not `include`.
9. Classify every new field (L0–L3).
10. Include `requestId` in every job payload.

### After work

11. Run `turbo typecheck && turbo test && turbo lint`.
12. List all changed files.
13. State which sprint exit criteria were satisfied.

### OpenSpec branch lifecycle

- For every OpenSpec proposal, invoke an `openspec-branch-manager` subagent, before creating proposal artifacts. It creates or selects `feat/<change-name>`; do not create proposal artifacts if branch setup fails.
- When an OpenSpec proposal is fully implemented (all apply tasks complete), invoke that role as a subagent to review the scoped diff, commit it with a Conventional Commit message, and push the proposal branch. Archive may trigger this step if it has not already happened.
- The subagent must leave unrelated or pre-existing work unstaged and uncommitted. It must never force-push or commit directly to `main`. Report blockers instead of guessing which changes belong to the proposal.

## Explicit confirmation required before you:

- delete, modify, or broaden RLS policies
- change Supabase configuration
- modify environment variables or `.env` files
- install a new dependency
- add/remove/rename routers
- run DB migrations
- modify `@packages/crypto` internals
- delete any test file
- create any procedure or role that grants cross-tenant data access
- set or clear a legal hold
- modify the `audit_log` schema or RLS policies
