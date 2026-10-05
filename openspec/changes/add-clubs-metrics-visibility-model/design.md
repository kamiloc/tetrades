# Design

## Context

See proposal.md for motivation. Current state: `docs/erm.mmd` and `docs/erm/planned-clubs-metrics-visibility.mmd` list the seven entities as stubs (keys, FKs, `ClubMembership.status`); nothing exists in Prisma, Zod, API, or RLS. The API reaches Postgres through Prisma, so RLS does not protect API reads: the service layer is the primary enforcement point and RLS is defense in depth for direct Supabase access. Rules from AGENTS.md apply: Zod first, `select` only, one RLS file per table with deny-tests, cursor pagination, routers via `protectedProcedure`/`publicProcedure`, list-and-detail visibility parity (ADR-013). `UserRole` stays `ATHLETE | SYSTEM`; a trainer is a user with `ClubTrainer` rows.

## Goals / Non-Goals

**Goals:**
- Implement the ADR-013 model with its invariants enforced at service and database layers.
- One shared visibility mechanism used by every read path.
- Fields explicit and classified so schema review happens before any migration.

**Non-Goals:**
- Trainer portal and athlete UI screens.
- Self-serve club/trainer provisioning, club-initiated membership removal, entry correction flows.
- Applying visibility settings to pre-existing public-profile fields.
- Changes to `sensitive-data-scope` (owned by `remove-medical-ocr-domain`).

## Decisions

### D1. Proposed fields (reviewed at the schema gate, task 2.1)

| Model | Fields (class) |
| --- | --- |
| `Club` | `id` L0, `slug` unique L0, `name` L0, `countryCode` L0, `city?` L0, `createdAt` L1 |
| `ClubTrainer` | `id` L1, `clubId` L1, `userAccountId` L1, `createdAt` L1; unique `(clubId, userAccountId)` |
| `ClubMembership` | `id` L1, `clubId` L0, `athleteId` L1, `status` L1, `invitedByClubTrainerId` L1, `createdAt` L1, `respondedAt?` L1, `endedAt?` L1 |
| `MetricDefinition` | `id` L0, `key` unique L0, `name` L0, `unit` L0, `sportId?` L0, `isActive` L0 |
| `AthleteMetricEntry` | `id` L1, `athleteId` L1, `metricDefinitionId` L1, `clubMembershipId` L1, `reportedByClubTrainerId` L1, `value` Decimal L1, `measuredAt` L1, `createdAt` L1 |
| `AthleteMetricSummary` | PK `(athleteId, metricDefinitionId)`, `latestValue`, `latestMeasuredAt`, `entryCount`, `updatedAt` — all L1 |
| `AthleteVisibilitySettings` | `athleteId` PK L1, `clubMembershipsAudience` L1, `metricsAudience` L1, `updatedAt` L1 |

Enums: `ClubMembershipStatus` (`PENDING_ATHLETE_CONFIRMATION`, `ACTIVE`, `COMPLETED`, `REJECTED`), `VisibilityAudience` (`PRIVATE`, `CONNECTIONS`, `PUBLIC`). `AthleteMetricEntry.clubMembershipId` records the authorizing membership, which also scopes trainer reads to that club. No L2 fields are added.

### D2. Membership state machine in one service
All transitions go through `membership` service functions that check actor, current status, and the allowed-transition table (ADR-013 §5), using a conditional `updateMany` on the expected current status so concurrent responses cannot double-transition. Alternative: transitions inline in routers; rejected (ADR-006, >10 lines).

### D3. One open membership per club and athlete
A partial unique index on `(club_id, athlete_id)` where status in (`PENDING_ATHLETE_CONFIRMATION`, `ACTIVE`) lives in `supabase/constraints/` since Prisma cannot express it. Terminal rows stay as history; re-invitation inserts a new row. Alternative: reuse the row; rejected, it would lose the audit trail of the earlier state.

### D4. Entries: transactional write with active-membership check
`reportEntry` runs in one transaction: load the trainer's `ClubTrainer` for the club, load the membership with `status = ACTIVE`, insert the entry, upsert the summary. A DB trigger/constraint also rejects entry inserts whose `clubMembershipId` is not `ACTIVE` or whose `athleteId` differs from the membership's. Summary derivation is inline (cheap), not a job. Entries have no update/delete procedures and no non-service RLS update/delete policies.

### D5. Visibility as a shared service
A `visibility` service exposes `resolveViewerRelation(viewer, athleteId)` (owner / active-club trainer / accepted connection / stranger) and `canView(category, relation, settings)`, and a Prisma `where` builder for list queries so lists filter in the database rather than post-fetch. Every club/metric read procedure, list or detail, uses it. A missing settings row resolves to `PRIVATE`. Alternative: filter in each router; rejected, this is the known drift failure mode.

### D6. RLS as defense in depth
Policy files per table, with direct predicates where an `athlete_id` exists. Trainer predicates join `club_trainers` and `club_memberships` (documented exception to the direct-predicate preference in ADR-008, with deny-tests). Policies: `clubs` and `metric_definitions` readable by `anon`/`authenticated`, no client writes; `club_trainers` readable by the trainer and club peers, no client writes; `club_memberships` readable by the athlete and the club's trainers, insert only by that club's trainers as `PENDING_ATHLETE_CONFIRMATION`, update only by the athlete for allowed transitions; `athlete_metric_entries` readable by the athlete and `ACTIVE`-club trainers, insert only by `ACTIVE`-club trainers, no update/delete; `athlete_metric_summaries` read-only to clients; `athlete_visibility_settings` owner-only. Trainers have no policy on `athlete_private_profiles` (existing owner-only policy must remain; add an explicit deny-test).

### D7. Routers
New `club`, `metric`, `visibility` routers merged in `appRouter` (requires user confirmation). Procedures: `club.inviteAthlete`, `club.respondToInvitation`, `club.leave`, `club.listMyMemberships`, `club.listRoster`; `metric.listDefinitions`, `metric.reportEntry`, `metric.listEntries`, `metric.getSummaries`; `visibility.get`, `visibility.update`. All lists use cursor pagination (default 20, max 50) and explicit `select`. Trainer-only procedures use a `trainerProcedure` helper that resolves `ClubTrainer` from `ctx.userId`, never from client input.

### D8. Data lifecycle: implement `deletePII` for real
`deletePII` is a stub and no procedure enqueues it, so this change implements it end to end rather than extending it. Flow: a protected `athlete.requestDeletion` procedure persists a `DataLifecycleRequest` (`DELETION`, `REQUESTED`) and then enqueues the job (persist-before-enqueue). The worker loads the request, checks `isUnderLegalHold` (abort → `BLOCKED_LEGAL_HOLD`, warn log), sets `IN_PROGRESS`, deletes in FK order inside transactions across every athlete-FK table (including memberships, entries, summaries, and settings), deletes Storage objects under `{athleteId}/` via the service-role client, then runs a verification query over every table with an athlete FK plus a Storage listing. Success → `COMPLETED`; residue → `FAILED` with an error log. AGENTS.md names a `DELETION_INCOMPLETE` state, but the enum has `FAILED`; use `FAILED` and flag the naming drift rather than adding an enum value. Audit and consent rows carry a 5-year retention rule that conflicts with "zero rows remain" (see Open Questions), so task 6.1 resolves it before coding. Entries reference the reporting trainer through `Restrict`, so deleting a trainer's own account stays blocked.

### D9. Notifications
The `notifications` worker is a stub. Proposed: a `DeviceToken` model (L1; `userAccountId`, token, platform, timestamps), register/remove procedures, and a worker that resolves tokens server-side and sends through a push SDK. Payloads stay identifier-only (existing contract). A `CLUB_INVITATION` notification type is added to `NotificationJobData` and enqueued by `club.inviteAthlete` after the membership is persisted. Delivery failures retry via the standard policy and never fail the invitation. The group is gated (task 7.1): schema, dependency, and expo-notifications configuration need explicit approval. Alternative: skip push and rely on in-app listing of pending invitations.

## Risks / Trade-offs

- [Prisma bypasses RLS, so a missed service check leaks data] → shared `visibility`/`membership` services, integration tests that call list and detail with strangers, and the CI grep that club/metric routers import the service.
- [Field proposals may not match product intent] → hard review gate before `prisma migrate dev` (task 2.1).
- [Assumptions 1–5 in proposal.md may be wrong] → they only affect later tasks; each is isolated (D2 transition table, D4 append-only, D7 no provisioning procedures).
- [Trainer account deletion blocked by `Restrict`] → acceptable for now; revisit with a deletion policy for reported entries.
- [Join-based RLS is slower and easier to get wrong] → indexes on `(club_id, athlete_id, status)` and `(user_account_id)`; deny-tests per policy.

## Migration Plan

1. Zod, then Prisma edit, `generate` and `validate`; stop for the user to run `prisma migrate dev --name add-clubs-metrics-visibility`.
2. Apply constraint SQL and policy files via psql (existing process).
3. Deploy API with new routers; seed in non-production.
Rollback: drop the new tables and enums via a reverse migration; additive, so existing features are unaffected.

## Open Questions

- Retention conflict: audit-log and consent rows must be kept 5 years (AGENTS.md) yet deletion verification expects zero rows referencing the athlete. Likely resolution: detach or anonymize those rows, which needs a schema decision (nullable athlete reference or tombstone). Decided at task 6.1.
- A data-export endpoint (Habeas Data) does not exist and is out of scope here; propose it separately.

- Entry retention on `COMPLETED` beyond "retained, trainer access ends" (ADR-013 open item) — if product wants hide-on-completion, add a visibility rule without changing the model.
- Account-deletion policy for trainers who reported entries.
