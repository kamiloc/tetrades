# AGENTS.md — Athlete Social Network (The Athlete Passport)

This file translates the repository-wide rules in `CLAUDE.md` into an execution checklist for all agents.

## Read order before coding
1. `CLAUDE.md`
2. `docs/adr/README.md`
3. `docs/project-architecture.md`
4. `docs/data-classification.md`
5. `docs/pii-access-matrix.md`
6. The package or app `README.md` for the folder you are changing

## Non-negotiable constraints
- TypeScript strict mode is mandatory.
- Never use `any`, `@ts-ignore`, `@ts-expect-error`, or non-null assertions.
- Keep `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax` enabled.

## Repo boundaries
- Packages never import from `apps/`.
- Apps never import from each other.
- Shared imports must come from `@packages/*`.
- Shared packages must stay platform-agnostic: no `react-native`, no DOM-only APIs.
- UI rendering code lives only inside apps.

## UI policy
- Do not create shared cross-platform UI packages.
- Do not install Solito, `@expo/next-adapter`, or any UI bridge layer.
- Web UI belongs in `apps/web/components`.
- Mobile UI belongs in `apps/mobile/components`.
- Shared packages may only export validators, typed API hooks, pure TS utilities, auth wrappers, crypto functions, and job types.

## State policy
- Do not add Zustand, Redux, Jotai, Recoil, MobX, or any global state library.
- Server state flows through tRPC + TanStack Query.
- Local UI state uses `useState` or `useReducer`.
- Invalidate query caches instead of inventing global state.

## Contract chain
- Zod is the source of truth.
- All schemas live in `packages/validators`.
- Every tRPC procedure must use `.input()` and `.output()` with schemas imported from `@packages/validators`.
- Never define inline Zod schemas inside procedures.
- Update Zod first, then Prisma, in the same change set.

## Prisma rules
- Always use `select`, never `include`.
- Never return raw Prisma records directly to clients.
- Never use `$queryRaw` unless the user explicitly approves it.
- If `schema.prisma` changes: run `prisma generate`, run `prisma validate`, stop, and tell the user to run `prisma migrate dev --name <name>`.
- Never run migrations or reset commands on behalf of the user.

## tRPC rules
- Every procedure uses `publicProcedure` or `protectedProcedure`; never the base procedure.
- Use `TRPCError` for all user-facing errors.
- Use `superjson` as the transformer.
- Use `httpBatchLink` on clients.
- In Next.js Server Components, use `createCallerFactory`; do not call your own HTTP API.
- Extract business logic into service functions once a procedure becomes more than ~10 lines.

## Auth rules
- App code must go through `@packages/auth`; never call Supabase auth APIs directly from apps.
- Trust only `ctx.userId` derived from a verified JWT.
- Magic Link is primary auth, OTP fallback.
- Do not add email/password auth.
- Use Supabase-managed sessions.
- Expo tokens live in `expo-secure-store`.
- Next.js sessions use httpOnly cookies via Supabase SSR helpers.

## Crypto rules
- `@packages/crypto` exports exactly `encryptPII()` and `decryptPII()`.
- Use `node:crypto` AES-256-GCM only.
- Do not add third-party crypto libraries.
- Never log plaintext, ciphertext, or keys.
- Never put PII in URL query strings.
- Only backend/server contexts may decrypt PII.

## RLS rules (highest hallucination risk)
- Put every policy in `supabase/policies/<table>.sql`.
- Never place RLS inside Prisma migrations or application code.
- Every policy file must enable and force RLS.
- Every policy change needs an allow-test and a deny-test in `tests/rls`.
- Always test cross-tenant denial with two distinct user IDs.
- Do not delete or broaden an RLS policy without explicit user confirmation.

## OCR state machine rules
- Allowed flow only: `UPLOADED -> PROCESSING -> PENDING_REVIEW -> VERIFIED` or human-only `REJECTED`.
- Never skip a state.
- `ocrRawOutput` is immutable.
- UIs and public APIs must read only from `verifiedData`.
- Only `verifyDocument` may write `verifiedData`.
- On OCR job failure, revert to `UPLOADED`; do not mark `REJECTED` automatically.

## Job rules
- Use BullMQ + Redis via `@packages/queue`.
- Job payloads must be typed and serializable.
- Every job has retries, exponential backoff, and recoverable-state handling.
- Persist the triggering DB record before enqueueing the job.
- Do not do CPU-heavy work inside tRPC procedures.

## Storage and image rules
- Medical documents use signed URLs with max 15-minute expiry.
- Generate signed URLs only through `storageRouter`.
- Uploads are direct-to-storage, never multipart through Fastify.
- Use `sharp` only for image processing.
- Generate exactly 3 image variants: 150, 400, 1200 WebP.
- Image optimization runs in a background job.

## Web rules
- App Router only; never create `pages/`.
- Public athlete pages must be Server Components with ISR `revalidate: 3600`.
- Implement `generateMetadata()` with SEO and structured data.
- Public pages must never expose medical data.
- Public data fetching on the server uses tRPC caller factories, not HTTP self-calls.

## Mobile rules
- Use `expo-router` only.
- Do not install `react-navigation` directly.
- Use NativeWind for new styling.
- Use `expo-image-picker` for document/photo intake.
- Use `expo-notifications` for push and configure deep-linking in `app.json`.

## Testing rules
- Vitest only.
- Every procedure needs success, invalid-input, auth, and not-found coverage.
- Never mock Prisma in integration tests.
- Never skip failing tests.
- Run `turbo typecheck && turbo test && turbo lint` before handoff.

## Logging rules
- Use Pino / Fastify logger.
- No `console.log` in production code.
- Include `requestId` in logs.
- Never log PII, credentials, encryption material, or tokens.

## Dependency rules
- Ask for user approval before adding a package.
- Prefer native `fetch`, `date-fns`, `sharp`, `node:crypto`, `cuid()` via Prisma, Zod, and Vitest.
- Do not install alternate libraries that duplicate the preferred stack.

## Performance rules
- Always paginate with cursor + `take`; default 20, max 50.
- Avoid sequential DB calls when a single explicit `select` query can do the work.
- Do not call external APIs directly from tRPC procedures; enqueue jobs instead.
- Respect the DB connection budget.

## Agent protocol
### Before starting
1. Read `CLAUDE.md` fully.
2. Run `turbo typecheck`.
3. Identify sprint/task.
4. List files you expect to change.

### During work
5. Do not modify `schema.prisma` without user approval.
6. Do not run `prisma migrate dev`.
7. Keep changes within the correct app/package.
8. Run `turbo test` after completing the task.
9. Use `select`, not `include`.

### After work
10. Run `turbo typecheck && turbo test && turbo lint`.
11. List all changed files.
12. State which sprint exit criteria were satisfied.

## Explicit confirmation required before you:
- delete or broaden RLS policies
- change Supabase configuration
- edit `.env` values
- install a new dependency
- add/remove/rename routers
- run DB migrations
- modify `@packages/crypto` internals
- delete any test file
