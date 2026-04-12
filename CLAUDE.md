# CLAUDE.md — Athlete Social Network (The Athlete Passport)

> **This file is the single source of truth for all AI agents (Claude Code, Codex) working in this repository.**
> Read this file in its entirety before writing any code. Every rule here exists because its violation was observed in practice.

---

## Project Overview

**Product:** A LinkedIn-style social network for athletes focused on verifiable physical and medical records.
**Regulatory Context:** Colombian Habeas Data (Ley 1581 de 2012). Designed for future GDPR compliance.
**Development Model:** ~90% AI-agent generated code. Architecture is intentionally rigid and type-safe to prevent agent hallucination.
**Primary Language:** TypeScript (strict mode, no `any`).

---

## Stack Reference

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
| Storage          | Supabase Storage (Signed URLs)    | Via `storageRouter` in API |
| Medical OCR      | Claude Sonnet via Anthropic API   | Via `medicalRouter` in API |
| Background Jobs  | BullMQ + Redis                    | `packages/queue/`          |
| Styling (Web)    | Tailwind CSS                      | `apps/web/`                |
| Styling (Mobile) | NativeWind                        | `apps/mobile/`             |

---

## Data Classification

> Every field in every model belongs to exactly one classification level.
> When in doubt, classify UP (treat it as more sensitive, not less).

| Level  | Label          | Examples                                                                                                          | Storage Rule                                                                                               | Logging Rule                                                                 |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **L0** | `PUBLIC`       | Athlete name, sport, public bio, verified achievements, connection count                                          | Plaintext. Served via public API and SSR.                                                                  | May appear in logs.                                                          |
| **L1** | `INTERNAL`     | Email address, account creation date, login timestamps, device tokens                                             | Plaintext. Accessible only by the owning athlete and system services.                                      | May appear in structured logs, NEVER in error messages returned to clients.  |
| **L2** | `CONFIDENTIAL` | Medical test values, diagnoses, medication names, doctor names, clinic addresses, personal identification numbers | Encrypted at rest via `@packages/crypto` AND Supabase Vault. Signed URLs with 15-min expiry for documents. | NEVER logged at any level. Decryption requires an audit event.               |
| **L3** | `RESTRICTED`   | Master encryption keys, Supabase service-role keys, Anthropic API keys                                            | Environment variables only. Never in source, seed files, .env.example, or CI logs.                         | NEVER logged. NEVER passed as function arguments outside `@packages/crypto`. |

### Classification Rules

```
- EVERY new field added to a Prisma model MUST be assigned a classification level in a
  code comment on the same line:
    email       String   // L1-INTERNAL
    hemoglobin  Float?   // L2-CONFIDENTIAL
    sport       String   // L0-PUBLIC

- EVERY Zod schema in @packages/validators MUST mirror these classifications.
  L2-CONFIDENTIAL fields are NEVER included in public-facing output schemas.

- Profile photos are L0-PUBLIC after optimization. However, original uploads are L1-INTERNAL
  because they may contain EXIF metadata (GPS coordinates, device info, timestamps).
  The `optimizeImage` background job MUST strip all EXIF metadata before generating
  public-facing variants. Use `sharp.withMetadata(false)` or `sharp({ failOnError: false })`
  with explicit metadata removal.

- The `ocrRawOutput` field is L2-CONFIDENTIAL because it contains extracted medical values,
  even though it is a system artifact. It follows all L2 storage and access rules.
  Doctor names and clinic addresses extracted by OCR into `ocrRawOutput` and `ocrParsedData`
  remain L2-CONFIDENTIAL and are encrypted along with all other medical data in those JSON
  columns.
```

---

## Monorepo Structure

```
tetrades/
├── CLAUDE.md                          ← YOU ARE HERE
├── turbo.json
├── package.json
├── tsconfig.base.json
|
├── docs/
│
├── apps/
│   ├── api/                           # Fastify + tRPC server
│   │   ├── src/
│   │   │   ├── server.ts              # Fastify entry point
│   │   │   ├── context.ts             # tRPC context (Prisma, auth, requestId)
│   │   │   ├── router/
│   │   │   │   ├── index.ts           # Root appRouter (merges all sub-routers)
│   │   │   │   ├── athlete.ts
│   │   │   │   ├── medical.ts
│   │   │   │   ├── achievement.ts
│   │   │   │   ├── connection.ts
│   │   │   │   └── storage.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts            # JWT verification + userId injection
│   │   │   │   └── rateLimit.ts
│   │   │   ├── services/              # Business logic extracted from routers
│   │   │   │   └── audit.ts           # Audit event emitter
│   │   │   └── jobs/                  # BullMQ worker entry points
│   │   │       ├── processOCR.ts
│   │   │       ├── optimizeImage.ts
│   │   │       └── deletePII.ts
│   │   └── tsconfig.json
│   │
│   ├── web/                           # Next.js (App Router) — public profiles
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── athlete/[slug]/
│   │   │   │   └── page.tsx           # Public profile (SSR)
│   │   │   ├── search/
│   │   │   │   └── page.tsx           # Athlete directory
│   │   │   └── sitemap.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                        # Expo + React Native
│       ├── app/                        # expo-router (file-based)
│       │   ├── (tabs)/
│       │   │   ├── index.tsx          # Dashboard
│       │   │   ├── profile.tsx
│       │   │   ├── documents.tsx
│       │   │   ├── achievements.tsx
│       │   │   └── network.tsx
│       │   ├── auth/
│       │   │   ├── login.tsx
│       │   │   └── verify.tsx
│       │   └── _layout.tsx
│       └── tsconfig.json
│
├── packages/
│   ├── validators/                    # Zod schemas — THE source of truth
│   │   ├── src/
│   │   │   ├── athlete.ts
│   │   │   ├── medical.ts
│   │   │   ├── achievement.ts
│   │   │   ├── connection.ts
│   │   │   ├── storage.ts
│   │   │   └── index.ts              # Re-exports everything
│   │   └── package.json
│   │
│   ├── auth/                          # Supabase auth wrapper
│   │   ├── src/
│   │   │   ├── client.ts             # Browser/RN client (pure TS)
│   │   │   ├── server.ts             # Server-side verification (pure TS)
│   │   │   ├── hooks.ts              # useAuth, useSession (React hooks — react import OK here)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── crypto/                        # Envelope encryption
│   │   ├── src/
│   │   │   ├── encrypt.ts            # encryptPII()
│   │   │   ├── decrypt.ts            # decryptPII()
│   │   │   ├── audit.ts              # emitDecryptionAudit() — internal only, NOT exported
│   │   │   └── index.ts              # ONLY exports encryptPII and decryptPII
│   │   └── package.json
│   │
│   ├── api-client/                    # Typed tRPC hooks for both apps
│   │   ├── src/
│   │   │   ├── client.ts             # tRPC client config + httpBatchLink
│   │   │   ├── hooks.ts              # useAthleteProfile, useMedicalDocs, etc.
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-logic/                  # Pure TS utilities (NO React, NO RN)
│   │   ├── src/
│   │   │   ├── formatters.ts         # Date/number formatting (Colombian locale)
│   │   │   ├── converters.ts         # kg↔lb, cm↔ft, unit conversions
│   │   │   ├── constants.ts          # Enums, sport categories, status labels
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── queue/                         # BullMQ job definitions
│   │   ├── src/
│   │   │   ├── connection.ts         # Redis connection config
│   │   │   ├── queues.ts             # Queue instances (ocrQueue, imageQueue, piiQueue)
│   │   │   ├── types.ts              # Typed job payloads (MUST include requestId)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── eslint-config/                 # Shared ESLint + Prettier config
│       └── index.js
│
├── supabase/
│   ├── policies/                      # One SQL file per table
│   │   ├── athletes.sql
│   │   ├── medical_documents.sql
│   │   ├── achievements.sql
│   │   ├── connections.sql
│   │   ├── pii_consent_log.sql
│   │   └── audit_log.sql
│   └── migrations/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── tests/
    ├── rls/                           # Cross-tenant denial tests
    └── crypto/                        # Encryption round-trip + audit tests
```

---

## Package Contracts

> Every package and app declares what it owns, what it exports, and what it must never do.
> AI agents MUST respect these boundaries. If a task requires violating a contract, STOP and ask the user.

| Package / App            | May Import From                                                                                                      | Exports                                                                           | NEVER Do                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `@packages/validators`   | `zod` only                                                                                                           | Zod schemas, inferred TS types                                                    | Import from any other package or app                                              |
| `@packages/shared-logic` | Standard library only (`Intl`, `Date`)                                                                               | Pure functions, constants, enums                                                  | Import React, Zod, Prisma, or any package                                         |
| `@packages/auth`         | `@supabase/supabase-js`, `@supabase/ssr`, `react` (hooks.ts ONLY)                                                    | `useAuth`, `useSession`, `useSignIn`, `useSignOut`, `verifyToken`, `createClient` | Import from `react-native`, `expo-*`, or any app                                  |
| `@packages/crypto`       | `node:crypto` only                                                                                                   | `encryptPII()`, `decryptPII()` — nothing else                                     | Export internal helpers, import any external crypto lib                           |
| `@packages/api-client`   | `@trpc/react-query`, `@trpc/client`, `@packages/validators`                                                          | Typed tRPC hooks, client config                                                   | Contain business logic, call Prisma, import from apps                             |
| `@packages/queue`        | `bullmq`, `ioredis`                                                                                                  | Queue instances, typed job payloads                                               | Contain job execution logic (workers live in `apps/api/src/jobs/`)                |
| `@app/api`               | Any `@packages/*`, `@prisma/client`, `fastify`, `@trpc/server`                                                       | tRPC router type (for client inference)                                           | Import from `react`, `react-native`, `apps/web`, `apps/mobile`                    |
| `@app/web`               | `@packages/validators`, `@packages/api-client`, `@packages/auth`, `@packages/shared-logic`, `next`, `react`          | Nothing (leaf app)                                                                | Import from `react-native`, `expo-*`, `apps/mobile`, `apps/api` (use tRPC caller) |
| `@app/mobile`            | `@packages/validators`, `@packages/api-client`, `@packages/auth`, `@packages/shared-logic`, `expo-*`, `react-native` | Nothing (leaf app)                                                                | Import from `react-dom`, `next`, `apps/web`, `apps/api`                           |

**Clarification on `@packages/auth`:** This package MAY import from `react` because
`hooks.ts` exports React hooks (`useAuth`, etc.). However, it MUST NOT import from
`react-native`, `expo-*`, or `react-dom`. The hooks use only React's core API
(`useState`, `useEffect`, `useContext`) which is platform-agnostic. All other files
in `@packages/auth` (`client.ts`, `server.ts`) are pure TypeScript with zero React imports.

---

## Absolute Rules (NEVER Violate)

### 1. TypeScript Strictness

```
- NEVER use `any`. Use `unknown` and narrow with type guards.
- NEVER use `@ts-ignore` or `@ts-expect-error`.
- NEVER use non-null assertions (`!`). Use proper null checks or optional chaining.
- ALWAYS enable `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.
```

### 2. Package Boundaries

```
- NEVER import from `apps/` inside `packages/`. Packages are consumed by apps, never the reverse.
- NEVER import from one app inside another app. `apps/web` and `apps/mobile` MUST NOT reference each other.
- NEVER import from `react-native` inside `packages/`. The ONLY React import allowed in packages
  is `react` (core) inside `@packages/auth/src/hooks.ts` and `@packages/api-client/src/hooks.ts`.
- NEVER create a component that imports from both `react-native` and `react` (DOM). UI is always app-specific.
- ONLY `packages/` can be imported by multiple apps. Every shared import path starts with `@packages/`.
- Respect the Package Contracts table above. If a task requires a cross-boundary import, STOP and ask.
```

### 3. UI Sharing Policy

```
- UI components (anything that renders JSX with platform-specific elements) belong ONLY in their app:
    - Web components: `apps/web/components/`
    - Mobile components: `apps/mobile/components/`
- Shared packages export ONLY:
    - Zod schemas and inferred types (`@packages/validators`)
    - tRPC typed hooks (`@packages/api-client`)
    - Pure TypeScript functions (`@packages/shared-logic`)
    - Auth hooks and utilities (`@packages/auth`)
    - Encryption functions (`@packages/crypto`)
    - Job type definitions (`@packages/queue`)
- NEVER install Solito, @expo/next-adapter, or any cross-platform UI bridge library.
```

### 4. State Management

```
- NEVER install zustand, redux, jotai, recoil, mobx, or any global state library.
- ALL server data is managed through tRPC hooks (which use TanStack Query internally).
- Client-only UI state (modals, form steps, active tabs, filters) uses useState or useReducer.
- If you think you need global state, you are wrong. Use tRPC cache invalidation instead.
```

---

## Zod Schemas — The Contract Chain

The data flow contract is: **Zod → tRPC → Prisma**. Zod schemas are always the authority.

```
@packages/validators (Zod)
        ↓ imported by
    apps/api (tRPC input/output validation)
        ↓ must be compatible with
    prisma/schema.prisma (database model)
```

### Rules

```
- EVERY tRPC procedure input MUST use a Zod schema from `@packages/validators`.
- EVERY tRPC procedure output MUST be validated or typed by a Zod schema.
- NEVER define inline Zod schemas inside tRPC procedures. Import from `@packages/validators`.
- NEVER define Zod schemas inside `apps/`. All schemas live in `@packages/validators`.
- When adding a field to a Prisma model, ALWAYS add the corresponding field to the Zod schema FIRST.
- When removing a field from a Zod schema, ALWAYS remove it from the Prisma model in the same PR.
- A CI test MUST assert that Prisma-generated types are compatible with Zod-inferred types.
```

### Schema Naming Convention

```typescript
// In @packages/validators/src/athlete.ts

// Base schema (matches Prisma model fields)
export const athleteSchema = z.object({ ... });

// Input schemas (for tRPC mutations)
export const createAthleteInput = athleteSchema.pick({ ... });
export const updateAthleteInput = athleteSchema.partial().pick({ ... });

// Output schemas (for tRPC query responses)
export const athletePublicProfile = athleteSchema.omit({ ... }); // No L2 fields

// Inferred types (used everywhere)
export type Athlete = z.infer<typeof athleteSchema>;
export type CreateAthleteInput = z.infer<typeof createAthleteInput>;
```

---

## Database — Prisma Rules

### Query Rules

```
- NEVER use `include` for nested relations in any query.
  ALWAYS use `select` to explicitly list required fields.
  This prevents over-fetching and keeps response payloads predictable.

  // ❌ WRONG
  prisma.athlete.findUnique({ where: { id }, include: { achievements: true } });

  // ✅ CORRECT
  prisma.athlete.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sport: true,
      achievements: {
        select: { id: true, title: true, date: true, verified: true }
      }
    }
  });

- NEVER use raw SQL queries (`prisma.$queryRaw`) unless explicitly approved.
- ALWAYS use Prisma's typed query builder.
```

### Migration Rules

```
- NEVER run `prisma migrate dev` without explicit user confirmation.
- NEVER run `prisma migrate reset` in any branch other than local development.
- NEVER modify schema.prisma and create a migration in the same agent session without user review.
- When you need a schema change:
    1. Modify schema.prisma
    2. Run `prisma generate` to update the client
    3. Run `prisma validate` to check the schema
    4. STOP and tell the user: "Schema modified. Run `prisma migrate dev --name <n>` to create the migration."
- ALWAYS update the corresponding Zod schema in @packages/validators BEFORE modifying schema.prisma.
```

### Seed Data Rules

```
- Seed data in `prisma/seed.ts` MUST use realistic Colombian athlete data.
- Use proper Colombian names, real sports, plausible physical measurements.
- NEVER use "John Doe", "test@test.com", "lorem ipsum", or placeholder data.
- Include at least 5 athletes across different sports with complete profiles.
- Include medical documents in various states (UPLOADED, PROCESSING, PENDING_REVIEW, VERIFIED, REJECTED).
```

---

## tRPC — Router Rules

### Procedure Structure

```typescript
// ALWAYS follow this structure for every procedure:

export const athleteRouter = router({
  getProfile: protectedProcedure           // 1. Auth level (public or protected)
    .input(getAthleteInput)                 // 2. Input from @packages/validators
    .output(athletePublicProfile)           // 3. Output from @packages/validators
    .query(async ({ ctx, input }) => {      // 4. Implementation
      const athlete = await ctx.prisma.athlete.findUnique({
        where: { id: input.id },
        select: { ... }                     // 5. Explicit select, NEVER include
      });

      if (!athlete) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete not found',     // 6. User-facing error message
        });
      }

      return athlete;
    }),
});
```

### Rules

```
- EVERY procedure MUST specify .input() with a Zod schema from @packages/validators.
- EVERY procedure MUST use either `publicProcedure` or `protectedProcedure`. Never the base `procedure`.
- NEVER create a procedure that returns raw Prisma types. Always shape the output explicitly.
- NEVER expose internal IDs (Supabase user_id, internal foreign keys) in public-facing procedures.
- Use `superjson` as the transformer for proper Date/BigInt serialization.
- Use `httpBatchLink` in the client to coalesce requests.
- For Next.js SSR, use `createCallerFactory` (server-side caller), NOT HTTP calls.
```

### Router Organization

```
- One file per domain: athlete.ts, medical.ts, achievement.ts, connection.ts, storage.ts.
- Root router in `router/index.ts` merges all sub-routers.
- NEVER put business logic directly in the procedure handler. Extract to a service function if > 10 lines.
- NEVER add a new router file without updating the root `appRouter` merge.
```

---

## Auth Rules

### Implementation

```
- Auth wrapper lives ONLY in `@packages/auth`.
- NEVER call Supabase auth methods directly from app code. Always go through @packages/auth hooks.
- The auth middleware in `apps/api/src/middleware/auth.ts` extracts the JWT,
  verifies it via Supabase, and attaches `userId` to the tRPC context.
- NEVER trust client-provided user IDs. Always use `ctx.userId` from the verified JWT.
```

### Session Handling

```
- Magic Link is the primary auth method. OTP is the fallback.
- NEVER implement email/password auth.
- NEVER store tokens in localStorage. Use Supabase's built-in session management.
- Refresh tokens rotate automatically via Supabase's SDK. Do not implement custom rotation.
- For Expo: use `expo-secure-store` for token persistence (configured in @packages/auth).
- For Next.js: use httpOnly cookies via Supabase SSR helpers.
```

### Break-Glass Access Policy

```
There is NO admin or support role that can read another athlete's L2-CONFIDENTIAL data
through the application. If support access to restricted data is required (e.g., for
legal compliance, law enforcement request, or critical bug investigation):

1. Access MUST go through a direct database query using the Supabase service-role key.
2. The query MUST be logged in the `audit_log` table with:
   - actor: the support person's identity (email, not userId)
   - action: 'BREAK_GLASS_ACCESS'
   - target: athleteId + table + field accessed
   - justification: free-text reason (mandatory, cannot be empty)
   - requestId: correlation ID linking to the support ticket
3. The access MUST be approved by the project owner (Cristian) BEFORE execution.
4. NEVER build a break-glass feature in the application layer.
   Break-glass is a database-level operation, not an API endpoint.
5. AI agents MUST NOT create any tRPC procedure, middleware, or role that grants
   cross-tenant access to L2-CONFIDENTIAL data. No exceptions.
```

---

## Encryption Rules

### Package API

```
- @packages/crypto exports EXACTLY two functions: encryptPII() and decryptPII().
- NEVER export any other function, class, or utility from this package.
- NEVER use libsodium-wrappers, tweetnacl, or any third-party encryption library.
- ALL encryption uses node:crypto with AES-256-GCM (envelope encryption pattern).
```

### Usage Rules

```
- NEVER store encryption keys in source code, .env.example, seed files, or test fixtures.
- NEVER log encrypted data, decrypted data, or keys at any log level.
- NEVER pass PII fields in URL query parameters. Use POST request bodies.
- Fields requiring encryption (L2-CONFIDENTIAL): medical test values, personal identification
  numbers, medical diagnoses, medication names, doctor names, clinic addresses.
- Fields NOT requiring encryption (L0-PUBLIC): athlete name, sport, public bio,
  achievements (these are public data).
```

### Audit Logging for Decryption

```
Every call to decryptPII() MUST emit an audit event. This is enforced inside the
@packages/crypto package itself — the decryptPII function calls an internal
emitDecryptionAudit() before returning the plaintext.

The audit event contains:
  - actor: ctx.userId (who triggered the decryption)
  - action: 'DECRYPT_PII'
  - target: { table, recordId, field } (what was decrypted)
  - purpose: string (why — e.g., 'athlete_viewed_own_medical_record', 'data_export')
  - requestId: from tRPC context (correlation with the originating API call)
  - timestamp: ISO 8601

The audit record is written to the `audit_log` table in Supabase.

Rules:
- NEVER call decryptPII() without passing a valid purpose string.
  The function signature enforces this: decryptPII(payload, masterKey, auditContext).
- NEVER bypass the audit by calling node:crypto directly. ALL decryption goes through
  the package.
- The audit_log table is append-only. No UPDATE or DELETE policies exist on it.
  RLS on audit_log: athletes can SELECT their own audit records (transparency).
  No one can UPDATE or DELETE via the application.
- Audit events are L1-INTERNAL (they contain no decrypted values, only metadata about
  the access).
```

---

## RLS (Row Level Security) Policy Rules

> **This is the #1 hallucination risk area for AI agents. Follow these rules exactly.**

### File Organization

```
- ALL policies live in dedicated SQL files under `supabase/policies/`.
- One SQL file per table: athletes.sql, medical_documents.sql, audit_log.sql, etc.
- NEVER write RLS policies inline in Prisma migrations.
- NEVER write RLS policies in application code.
```

### Policy Template (ALWAYS follow this format)

```sql
-- ============================================
-- Table: [table_name]
-- Policy: [table]_[command]_[role]
-- Command: [SELECT | INSERT | UPDATE | DELETE]
-- Role: [authenticated | anon | service_role]
-- Purpose: [one sentence explanation]
-- NULL safety: [state whether the FK can be NULL and the consequence]
-- Composition: [how many policies of this command type exist on this table]
-- Tested in: tests/rls/[table].test.ts
-- ============================================

-- Enable RLS on the table (idempotent)
ALTER TABLE public.[table] ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too
ALTER TABLE public.[table] FORCE ROW LEVEL SECURITY;

CREATE POLICY "[table]_select_own"
  ON public.[table]
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Mandatory Rules

```
- EVERY policy MUST have a corresponding Vitest test in tests/rls/ that verifies:
    a) The policy ALLOWS the intended access pattern
    b) The policy DENIES cross-tenant access (test with two different user IDs)
    c) The policy handles NULL foreign keys correctly

- NEVER combine USING and WITH CHECK in a single policy
  unless you can explain in a comment why they must differ.

- NEVER write a permissive policy without considering its OR-composition
  with other policies on the same table and command.
  (PostgreSQL uses OR logic between policies of the same command type.
   Two SELECT policies where one is overly broad effectively bypasses the other.)

- After writing ANY RLS policy, IMMEDIATELY write the deny-test:

    test('athlete cannot read other athlete medical records', async () => {
      const { data, error } = await supabaseAsAthlete2
        .from('medical_documents')
        .select('*')
        .eq('athlete_id', athlete1Id);
      expect(data).toHaveLength(0);
    });

- NEVER modify an existing RLS policy without running the full tests/rls/ test suite.
- NEVER delete an RLS policy without explicit user confirmation.

- The `audit_log` table has special RLS rules:
    - SELECT: athletes can read their own audit records (auth.uid() = actor)
    - INSERT: service_role only (application writes via server-side Supabase client)
    - UPDATE: NO policy exists. Updates are forbidden.
    - DELETE: NO policy exists. Deletes are forbidden.
```

---

## Medical OCR State Machine

### Document Status Flow

```
UPLOADED → PROCESSING → PENDING_REVIEW → VERIFIED → REJECTED

No other transitions are allowed. NEVER skip a state.
```

### Rules

```
- The `ocrRawOutput` field is IMMUTABLE. Once written, it is never modified or deleted.
  It serves as an audit trail for disputed medical values.
  It is classified as L2-CONFIDENTIAL because it contains extracted medical data.

- NEVER read from `ocrParsedData` directly in any UI or API response.
  ALL medical data displayed to users MUST come from the `verifiedData` field.

- The ONLY way to populate `verifiedData` is through the `verifyDocument` tRPC procedure.
  No other procedure, job, or migration may write to this field.

- REJECTED is a HUMAN-ONLY status. No background job, automated process, or confidence
  threshold may transition a document to REJECTED. Only the `verifyDocument` procedure
  with explicit human input sets this status.

- Confidence scores are NEVER equivalent to verification. A confidence score of 99%
  does not mean the data is correct. Confidence scores are displayed as visual guidance
  for the human reviewer (e.g., highlight low-confidence fields in the review UI).
  NEVER use words like "confirmed", "validated", or "accurate" alongside confidence scores
  in any UI label, tooltip, or status badge.

- The OCR processing job (`processOCR`) MUST:
    1. Transition status to PROCESSING before calling Claude API
    2. Store the raw API response in ocrRawOutput (immutable)
    3. Validate extracted data against the Zod schema
    4. Store validated data in ocrParsedData
    5. Transition status to PENDING_REVIEW
    6. If ANY step fails, transition back to UPLOADED (not REJECTED)
    7. Log the failure reason at `error` level with the jobId, documentId, and requestId

- Claude Vision API calls MUST include:
    - model: 'claude-sonnet-4-20250514'
    - A system prompt that requests JSON output matching the Zod schema
    - A confidence field for every extracted value
    - max_tokens: 4096
```

---

## Background Jobs (BullMQ) Rules

```
- Job payloads MUST be defined as TypeScript types in `packages/queue/src/types.ts`.
- Job payloads MUST be serializable (no functions, no class instances, no Buffers).
- EVERY job payload MUST include a `requestId` field for correlation with the originating
  API call. This requestId propagates into worker logs so that a single user action
  can be traced from the tRPC call → job enqueue → job execution → completion/failure.
- EVERY job MUST have:
    - A typed payload (including requestId)
    - A maximum retry count (default: 3)
    - An exponential backoff strategy
    - Error handling that transitions related database records to a recoverable state
- NEVER process CPU-intensive work (image optimization, encryption) inside a tRPC procedure.
  Always enqueue a background job.
- NEVER enqueue a job without first persisting the triggering data to the database.
  (If the job queue is down, the data must survive for retry.)
```

---

## Supabase Storage Rules

```
- Medical documents (PDFs) MUST use signed URLs with a maximum expiry of 15 minutes.
- Profile photos use public URLs ONLY after optimization (originals are L1-INTERNAL).
- NEVER generate signed URLs on the client. Always go through the `storageRouter` tRPC procedures.
- File upload flow:
    1. Client requests a signed upload URL via `storageRouter.getUploadUrl`
    2. Client uploads directly to Supabase Storage using the signed URL
    3. Client confirms upload via `storageRouter.confirmUpload`
    4. Server enqueues the appropriate background job (OCR or image optimization)
- NEVER accept file uploads through the tRPC server (no multipart handling in Fastify).
  Always use signed URLs for direct-to-storage uploads.
- Storage bucket structure:
    medical-documents/           # Private bucket, signed URLs only
      └── {athleteId}/{documentId}.pdf
    profile-photos/              # Public bucket (optimized variants only)
      └── {athleteId}/original.{ext}    # L1-INTERNAL, never served publicly
      └── {athleteId}/thumb-150.webp    # L0-PUBLIC
      └── {athleteId}/card-400.webp     # L0-PUBLIC
      └── {athleteId}/full-1200.webp    # L0-PUBLIC
- The `original.{ext}` file is stored but NEVER served to clients directly.
  It is the source for the `optimizeImage` job and is retained for re-processing.
  Access to originals requires a signed URL through `storageRouter` (authenticated only).
```

---

## Image Optimization Rules

```
- Use `sharp` for all image processing. NEVER use jimp, canvas, or ImageMagick.
- Generate exactly 3 variants for profile photos:
    - Thumbnail: 150x150px, WebP, quality 80
    - Card: 400x400px, WebP, quality 85
    - Full: 1200x1200px, WebP, quality 90
- ALWAYS preserve aspect ratio. Use `sharp.resize({ fit: 'cover' })` for square crops.
- ALWAYS strip EXIF metadata from all output variants:
    sharp(input).withMetadata(false).resize(...).webp(...).toBuffer()
  This removes GPS coordinates, device info, timestamps, and any other embedded metadata.
  Original uploads may contain sensitive EXIF data (L1-INTERNAL) that must not leak
  into public-facing variants.
- Image optimization runs in the `optimizeImage` background job, NEVER in a tRPC procedure.
- For Next.js public profiles, use `next/image` with the Supabase Storage URL.
  Configure `images.remotePatterns` in `next.config.js` with the Supabase domain.
```

---

## Next.js (Public Web) Rules

```
- Use App Router exclusively. NEVER create files in a `pages/` directory.
- Public athlete profiles (`/athlete/[slug]`) MUST be server-rendered with ISR (revalidate: 3600).
- NEVER use `'use client'` on profile pages. They must be Server Components for SEO.
- For data fetching in Server Components, use tRPC's `createCallerFactory` (server-side caller).
  NEVER make HTTP calls to your own API from within Next.js Server Components.
- EVERY public page MUST implement `generateMetadata()` with:
    - Dynamic <title> and <meta description>
    - Open Graph tags (og:title, og:description, og:image)
    - Twitter card meta tags
    - JSON-LD structured data (Person + Athlete schema from schema.org)
    - Canonical URL
- NEVER expose medical data on public profile pages. Public profiles show ONLY L0-PUBLIC
  fields: sport, bio, verified achievements, profile photo (optimized variants), connection count.
- Sitemap at `/sitemap.xml` MUST be dynamic and include all public athlete profiles.
```

---

## Expo (Mobile App) Rules

```
- Use expo-router (file-based routing) exclusively.
- NEVER use react-navigation directly. expo-router wraps it.
- NEVER install react-native-web or any web compatibility layer.
- For styling, use NativeWind (Tailwind for React Native). NEVER use StyleSheet.create
  for new components (existing code may use it; don't refactor without approval).
- For secure token storage, use `expo-secure-store`. NEVER use AsyncStorage for auth tokens.
- Deep linking for Magic Link must be configured in `app.json` under `scheme`.
- Camera/gallery access for document upload uses `expo-image-picker`.
- Push notifications use `expo-notifications` with the configured credentials.
```

---

## Testing Rules

### Required Test Types

```
- Unit tests: Zod schema validation, pure utility functions, encryption round-trips.
- Integration tests: Every tRPC procedure (valid input, invalid input, auth checks).
- RLS tests: Cross-tenant denial for every policy (MANDATORY — see RLS section).
- Audit tests: Verify that decryptPII() emits an audit event for every call.
- E2E tests: Critical user journeys (deferred to Sprint 7+).
```

### Testing Conventions

```
- Test runner: Vitest (NOT Jest).
- Test files: Co-located with source as `*.test.ts` or in `tests/` for cross-cutting concerns.
- EVERY tRPC procedure MUST have tests covering:
    a) Successful operation with valid input
    b) Zod validation error with invalid input
    c) 401 response when called without auth (for protected procedures)
    d) 404 response when resource doesn't exist
- NEVER mock Prisma in integration tests. Use a test database with seed data.
- NEVER skip or comment out failing tests. Fix them or report to the user.
- Run `turbo test` before committing. Failing tests block the commit.
```

---

## Error Handling Conventions

```typescript
// ALWAYS use TRPCError with appropriate codes:
throw new TRPCError({
  code: 'NOT_FOUND', // Resource doesn't exist
  message: 'Athlete not found',
});

throw new TRPCError({
  code: 'FORBIDDEN', // Auth valid, but not authorized for this resource
  message: 'You can only view your own medical records',
});

throw new TRPCError({
  code: 'BAD_REQUEST', // Invalid input (beyond what Zod catches)
  message: 'Cannot connect with yourself',
});

throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR', // Unexpected failure
  message: 'Failed to process document', // User-facing, no stack traces
});

// NEVER throw raw Error objects. ALWAYS use TRPCError.
// NEVER include stack traces, internal IDs, or SQL errors in error messages.
// NEVER expose Prisma error details to the client.
```

---

## Logging Rules

```
- Use Pino (Fastify's built-in logger). NEVER use console.log in production code.
- console.log is acceptable ONLY in seed scripts and one-off dev utilities.
- Log levels:
    - info: Request received, job started, job completed
    - warn: Retry triggered, rate limit approached, deprecation
    - error: Unhandled exception, job permanently failed, external API error
- NEVER log L2-CONFIDENTIAL or L3-RESTRICTED data at any level.
  This includes: names of patients, medical values, identification numbers,
  encryption keys, tokens, passwords, and decrypted plaintext.
- L1-INTERNAL data (email, deviceToken) may appear in structured logs but NEVER
  in error messages returned to clients.
- ALWAYS include requestId in log context for traceability.
- BullMQ worker logs MUST include the job's requestId (from the payload) so that
  the full chain — tRPC request → job enqueue → job execution — is traceable under
  a single correlation ID.
```

---

## Retention & Legal Hold

```
Habeas Data (Ley 1581) grants athletes the right to deletion, but legal obligations
may require temporary retention. These rules govern the interaction.

### Default Retention Periods

- Active athlete data: Retained while the account is active.
- Deleted athlete data: Hard-deleted within 30 days of deletion request
  (including Storage files and encrypted fields).
- Audit log records: Retained for 5 years after creation (regulatory minimum).
- pii_consent_log records: Retained for 5 years after creation.
- ocrRawOutput (for verified documents): Retained for 3 years after verification
  as a dispute resolution artifact.

### Legal Hold

- If a legal hold is placed on an athlete's data (e.g., pending legal investigation
  or regulatory inquiry), the `deletePII` job MUST check for an active hold before
  proceeding.
- Legal holds are represented by a `legal_hold` boolean field on the `athletes` table.
  When `legal_hold = true`:
    - The `deletePII` job MUST abort and log a warning: "Deletion blocked by legal hold"
    - The athlete MUST be informed that their deletion request is paused due to a legal
      obligation (without disclosing the specific reason unless required by law)
    - ONLY the project owner (Cristian) can set or clear a legal hold, via direct
      database access (not through the application API)
- AI agents MUST NOT create any procedure that clears a legal hold.

### Deletion Verification

- After `deletePII` completes, a verification query MUST check every table with a
  foreign key to the athlete and confirm zero remaining rows.
- The verification MUST also confirm that Supabase Storage buckets contain zero files
  under the athlete's prefix (`{athleteId}/`).
- If verification fails, the job transitions to a `DELETION_INCOMPLETE` state and
  alerts the project owner.
```

---

## Habeas Data Compliance Checklist

```
- [ ] Data classification levels (L0–L3) assigned to every field in every model
- [ ] pii_consent_log table records consent with timestamp and purpose code
- [ ] Athletes cannot upload medical data without active consent
- [ ] Data export endpoint generates a complete ZIP of all athlete data
- [ ] Data deletion endpoint cascades through ALL tables and Storage
- [ ] Post-deletion verification query confirms zero residual records
- [ ] Legal hold check prevents deletion of held data
- [ ] Audit log captures every decryptPII() call with actor, purpose, and target
- [ ] Privacy policy is linked from the registration flow
- [ ] All L2-CONFIDENTIAL fields are encrypted at rest via @packages/crypto
- [ ] Medical documents use signed URLs with 15-minute expiry
- [ ] Profile photo originals have EXIF metadata stripped before public variants
- [ ] RLS policies prevent cross-tenant access (verified by deny-tests)
- [ ] Audit log is append-only (no UPDATE/DELETE RLS policies)
- [ ] Retention periods are enforced by scheduled jobs (not ad-hoc deletion)
- [ ] Break-glass access is database-only, pre-approved, and audit-logged
```

---

## Git & Commit Conventions

```
- Branch naming: `feat/`, `fix/`, `chore/`, `refactor/` prefixes.
  Example: `feat/athlete-profile-crud`, `fix/rls-null-handling`.
- Commit messages: Conventional Commits format.
  Example: `feat(api): add athlete profile CRUD procedures`
  Example: `fix(rls): handle NULL athlete_id in medical_documents policy`
- NEVER commit directly to `main`. Always create a feature branch and PR.
- NEVER commit .env files, API keys, or secrets. Verify .gitignore before committing.
- ALWAYS run `turbo typecheck && turbo test && turbo lint` before pushing.
```

---

## Dependency Management

```
- NEVER install a new dependency without checking if an existing one covers the use case.
- NEVER install multiple libraries for the same purpose (e.g., don't add axios if fetch exists).
- Preferred choices (use these, not alternatives):
    - HTTP client: Native fetch (NOT axios, got, or node-fetch)
    - Date handling: date-fns (NOT moment, dayjs, or luxon)
    - Image processing: sharp (NOT jimp, canvas, or ImageMagick)
    - Hashing: node:crypto (NOT bcrypt, argon2 — Supabase handles password hashing)
    - UUID: cuid2 via Prisma @default(cuid()) (NOT uuid, nanoid)
    - Validation: Zod (NOT yup, joi, superstruct, or io-ts)
    - Testing: Vitest (NOT Jest, mocha, or ava)
- When you want to install a new package, state the package name and reason.
  The user must approve before you run `npm install`.
```

---

## Performance Guardrails

```
- NEVER fetch all records without pagination. ALWAYS use cursor-based pagination for lists:
    - Use `cursor` + `take` in Prisma queries (NOT offset-based skip/take for large datasets).
    - Default page size: 20 items. Maximum: 50 items.

- NEVER make sequential database calls when a single query would suffice.
  Use Prisma's nested select to fetch related data in one query.

- NEVER call external APIs (Claude, Supabase Storage) inside a tRPC procedure.
  Enqueue a background job instead.

- Database connection limit: 10 connections (set in DATABASE_URL).
  If you need more, discuss connection pooling with the user.
```

---

## Agent Session Protocol

### Before Starting ANY Task

```
1. Read this CLAUDE.md in its entirety.
2. Run `turbo typecheck` to ensure the current state is clean.
3. Identify which sprint and task number you are working on.
4. List the files you expect to create or modify.
5. Verify that your planned changes respect the Package Contracts table.
```

### During Implementation

```
6. NEVER modify schema.prisma without explicit user approval.
7. NEVER run `prisma migrate dev` — only the user runs migrations.
8. NEVER create files outside the designated package/app for your task.
9. ALWAYS run `turbo test` after completing a task.
10. ALWAYS use `select` (not `include`) in Prisma queries.
11. ALWAYS classify new fields with their data classification level (L0–L3).
12. ALWAYS include requestId in BullMQ job payloads.
```

### After Completing a Task

```
13. Run `turbo typecheck && turbo test && turbo lint`.
14. List all files created or modified.
15. State which sprint exit criteria this task satisfies.
```

### NEVER Do These Without Explicit User Confirmation

```
- Delete or modify existing RLS policies
- Change Supabase configuration
- Modify environment variables or .env files
- Install new dependencies not specified in the task
- Alter the tRPC router structure (add/remove/rename routers)
- Run database migrations
- Modify @packages/crypto internals
- Delete any test file
- Create any procedure or role that grants cross-tenant data access
- Set or clear a legal hold
- Modify the audit_log table schema or RLS policies
```
