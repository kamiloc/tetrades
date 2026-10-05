# Testing Strategy

## Test types

### Unit tests

- Zod schema validation
- encryption round-trips and decryption audit emission
- pure functions in `packages/shared-logic`

### Integration tests

- every tRPC procedure: success, invalid input, 401 when unauthenticated, 404 when missing
- auth middleware behavior
- storageRouter happy-path and invalid-path behavior
- list and detail endpoints return consistent results under identical visibility settings

### RLS tests

- mandatory for every policy file, in `tests/rls/`
- allow intended access
- deny cross-tenant access using two distinct users
- handle NULL foreign keys correctly

Pivot tables ([ADR-013](adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md)) require deny-tests for the following; they live in `tests/rls/{clubs,club_trainers,club_memberships,metric_definitions,athlete_metric_entries,athlete_metric_summaries,athlete_visibility_settings,device_tokens}.test.ts` and `tests/rls/athlete_private_profiles.trainer.test.ts`:

- `Club` and `ClubMembership`: a user outside the club or membership cannot read or modify it; an athlete cannot be associated without confirming
- `AthleteMetricEntry`: cross-tenant read and write denied, including a trainer from another club
- a trainer cannot write a metric entry for an athlete whose membership is `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED`, or `REJECTED`
- a trainer cannot read `AthletePrivateProfile` in any membership state
- `AthleteVisibilitySettings`: only the owning athlete can read or write

The API side is covered by `apps/api/src/__tests__/integration/{membership-service,metrics-service,clubs-metrics-visibility}.int.test.ts`, including list/detail parity under every audience.

### E2E tests

- deferred until Sprint 7+

## Conventions

- use Vitest only
- never mock Prisma in integration tests
- use a seeded test database
- failing tests block handoff
- run `turbo typecheck && turbo test && turbo lint` before push/handoff
