# ADR-005: Database Query Discipline and Migration Protocol

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Use explicit Prisma `select` queries everywhere and keep migration creation under user control.

## Rules

- `include` is forbidden
- `$queryRaw` is forbidden without explicit approval
- shape outputs intentionally for each procedure
- never run `prisma migrate dev` or `prisma migrate reset` as an agent
- if `schema.prisma` changes: update Zod first, run `prisma generate`, run `prisma validate`, stop and instruct the user to create the migration

## Consequences

- less over-fetching
- more predictable payloads
- safer migration lifecycle
