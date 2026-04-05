# ADR-012: Testing, Logging, and Agent Session Protocol

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision
Use Vitest + Pino + an explicit agent workflow to keep generated code verifiable.

## Rules
- every procedure gets success, invalid-input, auth, and not-found tests
- do not mock Prisma in integration tests
- no skipped failing tests
- use Pino, not `console.log`, in production code
- always include `requestId` in log context
- never log PII, keys, tokens, or passwords
- agent sessions must run `turbo typecheck`, `turbo test`, and `turbo lint`
- certain actions always require explicit user confirmation
