# Proposal

## Why

ADR-013 defines the post-pivot product (clubs, trainer-reported sport metrics, athlete-controlled visibility) and `docs/erm.mmd` already models it, but none of it exists in `schema.prisma`, Zod, the API, or RLS. With ADR-013's open items now closed (trainer derived from `ClubTrainer`; membership states `PENDING_ATHLETE_CONFIRMATION`, `ACTIVE`, `COMPLETED`, `REJECTED`), the model can be built.

## What Changes

- Add Prisma models `Club`, `ClubTrainer`, `ClubMembership`, `MetricDefinition`, `AthleteMetricEntry`, `AthleteMetricSummary`, `AthleteVisibilitySettings` and enums for membership status and visibility audience, each field classified L0–L3.
- Add matching Zod schemas in `@packages/validators` (written before Prisma), including L2-free public output schemas.
- Add tRPC routers `club`, `metric`, and `visibility`, plus services for the membership state machine, the visibility filter, and metric reporting with summary derivation.
- Add RLS policy files (one per table), DB constraints, and RLS deny-tests, including the pending-membership trainer write denial.
- Implement the `deletePII` worker (currently a stub that throws `not implemented`) with the Habeas Data cascade over all athlete-owned tables, including the new ones, legal-hold check, and post-deletion verification, plus a procedure for an athlete to request deletion.
- Implement the `notifications` worker (currently a stub) for push delivery, starting with club invitations, behind a scope-confirmation gate because device-token storage and a push dependency do not exist yet.
- Seed realistic Colombian clubs, trainers, memberships in every state, metrics, and entries.
- Promote the planned ERM annex to built fragments and update the classification, access-matrix, and testing docs from "planned" to current.
- **BREAKING (internal):** none for clients; this is additive.

### Assumptions to confirm (not covered by ADR-013)

1. Only the athlete can move `ACTIVE → COMPLETED`; club-initiated removal is out of scope.
2. Metric entries are append-only and retained after a membership becomes `COMPLETED`; trainer access ends, visibility to others follows the athlete's settings.
3. Clubs and trainers are provisioned out-of-band (seed / service-role DB access); no API creates them in this change.
4. Visibility settings cover only the new data (club memberships, metrics). Existing public-profile fields keep today's behavior.
5. Trainer portal and athlete UI screens are separate changes; this change delivers data model, API, RLS, and docs.
6. A data-export endpoint does not exist today and is out of scope here; it is recorded as a follow-up.
7. Push delivery needs a device-token model and a push SDK (new dependency); both are proposed in the notifications group and require explicit approval before any work.

## Capabilities

### New Capabilities
- `club-membership`: clubs, club trainers, invitations, athlete confirmation, and the four-state membership lifecycle.
- `sport-metrics`: metric catalog, trainer-reported entries gated by active membership, and derived summaries.
- `athlete-visibility`: athlete-owned audience settings and their enforcement on every list and detail read.
- `trainer-access-boundary`: what a trainer may and may never read or write, including the L2 prohibition.
- `athlete-data-lifecycle`: athlete-requested deletion with legal-hold blocking, full cascade, and verification.
- `membership-notifications`: invitation push notifications with identifier-only job payloads.

### Modified Capabilities

(none — `openspec/specs/` is empty; `sensitive-data-scope` is introduced by `remove-medical-ocr-domain`)

## Impact

- **Code:** `prisma/schema.prisma`, `prisma/seed.ts`, `packages/validators`, `packages/queue`, `apps/api` (routers, services, `deletePII`, `sendNotification`), `supabase/policies`, `supabase/constraints`, `tests/rls`.
- **Approvals needed (AGENTS.md):** adding routers, modifying `schema.prisma`, and running migrations require explicit confirmation; the agent stops after `prisma validate`.
- **Docs:** `docs/erm.mmd`, `docs/erm/*`, data-classification, pii-access-matrix, testing-strategy, ADR-013 status notes.
- **Dependencies:** possibly a push SDK (e.g. `expo-server-sdk`) for notifications, subject to approval; none otherwise. Independent of `remove-medical-ocr-domain`; either may land first.
