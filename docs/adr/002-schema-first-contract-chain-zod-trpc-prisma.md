# ADR-002: Schema-First Contract Chain (Zod → tRPC → Prisma)

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Zod schemas in `packages/validators` are the authoritative contracts for inputs and outputs. tRPC consumes those schemas. Prisma models must remain compatible with the validated shapes.

## Rules

- every tRPC procedure uses `.input()` and `.output()` with imported schemas
- no inline Zod schemas inside `apps/*`
- add fields to Zod first, then Prisma
- remove fields from Zod and Prisma in the same PR
- CI should assert compatibility between Prisma-generated and Zod-inferred types

## Consequences

- less contract drift
- safer refactors
- more predictable public/private output shaping
