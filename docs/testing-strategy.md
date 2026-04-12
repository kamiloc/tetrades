# Testing Strategy

## Test types

### Unit tests

- Zod schema validation
- encryption round-trips
- pure functions in `packages/shared-logic`

### Integration tests

- every tRPC procedure
- auth middleware behavior
- storageRouter happy-path and invalid-path behavior

### RLS tests

- mandatory for every policy file
- allow intended access
- deny cross-tenant access
- handle NULL foreign keys correctly

### E2E tests

- deferred until Sprint 7+

## Conventions

- use Vitest only
- never mock Prisma in integration tests
- use a seeded test database
- failing tests block handoff
- run `turbo typecheck && turbo test && turbo lint` before push/handoff
