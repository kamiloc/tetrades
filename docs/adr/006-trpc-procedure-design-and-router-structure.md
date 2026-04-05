# ADR-006: tRPC Procedure Design and Router Structure

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision
Every procedure must have explicit auth level, validated input/output, explicit error handling, and router-per-domain organization.

## Rules
- use `publicProcedure` or `protectedProcedure`, never bare `procedure`
- every procedure uses imported Zod `.input()` and `.output()`
- errors use `TRPCError`
- use `superjson`
- use `httpBatchLink` in clients
- use `createCallerFactory` for Next.js server-side calls
- extract service logic once a handler grows beyond a small threshold
- root router must merge every domain router explicitly
