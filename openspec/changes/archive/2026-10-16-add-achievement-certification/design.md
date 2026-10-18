# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- `AthleteAchievement.verificationStatus` (`UNVERIFIED | PENDING | VERIFIED | REJECTED`) and
  `verificationSource` already exist. The `(athleteId, verificationStatus)` index backs the
  non-owner read in `services/achievements.ts`, which filters on `VERIFIED` plus the
  `visibleAthleteWhere('achievements', viewer)` audience.
- RLS on `athlete_achievements` is owner-only for every command. The INSERT and UPDATE policies
  cannot restrict columns, which is why owners can write `verification_status` today.
- Trainer authority is proven by `trainerProcedure` (`apps/api/src/trpc.ts`), which yields
  `ctx.clubTrainer` for `input.clubId`. Metric entries already follow the "`ACTIVE` membership
  checked inside the write transaction" pattern (`services/metrics.ts`).
- Membership transitions go through `transitionMembership` in `services/membership.ts`. A DB
  trigger, `supabase/constraints/club_membership_transitions.sql`, enforces the lifecycle for every
  writer.
- Partial unique indexes live in hand-edited Prisma migrations and are mirrored in
  `supabase/constraints/*.sql` for documentation (`club_membership_open_unique`). Triggers are
  applied with `psql -f` from `supabase/constraints/`.
- The API's Prisma connection bypasses RLS and carries no JWT. End-user database access (supabase-js
  with a user JWT) runs as `anon` or `authenticated`, with `auth.role()` set.

## Goals / Non-Goals

**Goals:**
- Certification state cannot be forged from any end-user path, API or database.
- Trainers see the minimum needed to decide: one pending request, never the athlete's achievement
  list.
- Every `VERIFIED` achievement created from now on can be traced to a club and a trainer.

**Non-Goals:**
- No athlete edit procedure for achievements. The trigger covers direct edits; an API edit
  procedure is separate work.
- No admin or federation verification path. It is removed rather than reworked.
- No trainer-portal or mobile UI (Changes 5 and 8).

## Decisions

### D1. Separate request table; the achievement status is a summary

`AchievementCertificationRequest` has these columns:

| Field | Type | Class |
| --- | --- | --- |
| `id` | cuid | L1 |
| `achievementId` | FK AthleteAchievement | L1 |
| `clubId` | FK Club | L0 |
| `clubMembershipId` | FK ClubMembership (the authorizing `ACTIVE` membership) | L1 |
| `status` | `CertificationRequestStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` | L1 |
| `requestedAt` | timestamp | L1 |
| `decidedByClubTrainerId` | FK ClubTrainer, nullable | L1 |
| `decidedAt` | timestamp, nullable | L1 |
| `rejectionReason` | ≤ 300 chars, nullable | L1 |

- `clubMembershipId` mirrors `AthleteMetricEntry.clubMembershipId`: it records which membership
  authorized the request, and it makes "cancel this membership's open requests" a single indexed
  update.
- The achievement keeps `verificationStatus` as a stored summary rather than computing it from
  requests. The non-owner read and its index depend on it, and a join on every public read would
  cost more than a write-time update.
- **Alternative rejected:** columns on the achievement. They lose the history (rejected by A, then
  certified by B) and make an RLS rule scoped to the trainer awkward.

### D2. Database-enforced lifecycles

Two triggers enforce the lifecycles. They are in `supabase/constraints/` and applied with `psql`.

**`achievement_certification_transitions.sql`** applies to every writer, like
`club_membership_transitions`:
- INSERT must be `PENDING` with no decision fields.
- Allowed transitions: `PENDING → APPROVED | REJECTED | CANCELLED`. The other statuses are
  terminal.
- `APPROVED` and `REJECTED` require `decided_by_club_trainer_id` and `decided_at`. `REJECTED` also
  requires a non-empty `rejection_reason`.
- The identity columns (`achievement_id`, `club_id`, `club_membership_id`, `requested_at`) are
  immutable.
- **Partial unique index:** one open request per achievement,
  `UNIQUE (achievement_id) WHERE status = 'PENDING'`. It lives in the hand-edited migration and is
  mirrored in `supabase/constraints/achievement_certification_open_unique.sql`.

**`achievement_verification_integrity.sql`** applies only when `auth.role()` is `anon` or
`authenticated`:
- INSERT must have `verification_status = 'UNVERIFIED'` and `verification_source IS NULL`.
- UPDATE cannot change `verification_status` or `verification_source`.
- If an UPDATE changes the title, organization or achievement date of a `VERIFIED` row, the
  trigger sets `NEW.verification_status := 'UNVERIFIED'`. A reset is the only status change it
  allows.
- **Why scope it to roles:** the certification service writes through Prisma with no JWT
  (`auth.role()` is NULL), and it must keep changing the status. Keying on the role avoids a
  "trusted writer" flag that a client could spoof.
- **Alternative rejected:** column-level `GRANT UPDATE (title, organization, achieved_on)` to
  `authenticated`. That would block the reset-on-edit behavior, which needs the trigger anyway, and
  Supabase's default grants are table-wide, so the column grants drift easily.

### D3. Services and procedures

A new service, `services/certification.ts`. All procedures stay on the existing `achievement`
router, so no new router is added.

| Procedure | Auth | Notes |
| --- | --- | --- |
| `requestCertification({ achievementId, clubId })` | `protectedProcedure` (athlete) | Transaction: own achievement, not `VERIFIED`, `ACTIVE` membership with the club → insert `PENDING` → achievement `PENDING`. A unique-index violation maps to `CONFLICT`. |
| `withdrawCertification({ requestId })` | `protectedProcedure` (athlete) | Own `PENDING` request → `CANCELLED` → achievement `UNVERIFIED`. |
| `listMyCertificationRequests({ cursor, take })` | `protectedProcedure` (athlete) | Every status, with the club name and the rejection reason. |
| `listPendingCertifications({ clubId, cursor, take })` | `trainerProcedure` | `PENDING` requests for `ctx.clubTrainer.clubId`: achievement title, organization and date, plus the athlete's L0 identity (`athleteId`, display name, slug). |
| `decideCertification({ clubId, requestId, decision, rejectionReason? })` | `trainerProcedure` | Details below. |

`decideCertification` runs as a transaction:
1. The request must belong to `ctx.clubTrainer.clubId`, otherwise `FORBIDDEN`. An unknown request
   is `NOT_FOUND`.
2. The athlete must still have an `ACTIVE` membership with the club, otherwise `FORBIDDEN`.
3. A guarded `updateMany` sets the request from `PENDING` to the decision. If no row matches, the
   request was already decided: `BAD_REQUEST`.
4. The achievement becomes `VERIFIED` or `REJECTED`.

Where the input needs a reason, Zod enforces it: a discriminated union on `decision` requires
`rejectionReason` for `REJECT`.

**Error order** follows `metrics.reportEntry`: `NOT_FOUND`, then `FORBIDDEN`, then the state checks.

`addAchievement` now inserts `UNVERIFIED`. `verifyAchievement` and `verifyAchievementInput` are
deleted, which leaves the SYSTEM role unused here. `userRole.ts` still uses it for rate-limit tiers.

### D4. Leaving a club cancels open requests

`transitionMembership` already guards the status update with `updateMany`. When `to === 'COMPLETED'`
it now runs inside `prisma.$transaction`, alongside two more steps:
- cancel the requests where `clubMembershipId = id` and `status = 'PENDING'`;
- set those requests' achievements to `UNVERIFIED`.

An achievement's only open request is the one being cancelled, so resetting it to `UNVERIFIED` is
correct. `APPROVED` requests are untouched, so their achievements stay `VERIFIED` (spec:
"Certifications outlive the membership").

### D5. Club attribution on reads

`listAchievements` selects, for each `VERIFIED` achievement, the club name of its most recent
`APPROVED` request (`orderBy decidedAt desc, take 1`). Legacy rows have none.

Whether a caller may see the club is decided once per call, with the existing helpers in
`services/visibility.ts`:
`canView('clubMemberships', await resolveAudienceRelation(...), await loadAudienceSettings(...))`.
Those helpers already answer the per-athlete question, so the visibility logic isn't duplicated.

`certifyingClub` is `{ name }`, or `null` when there is none or the caller can't see it. The output
adds no ids, so the club's id never leaks the association. The owner always gets the name.

A list/detail parity test covers every procedure that returns achievement data. Today that is only
`listAchievements`; the test will catch any future detail read that skips the rule.

### D6. RLS on the new table

`supabase/policies/achievement_certification_requests.sql` (ENABLE and FORCE):
- `..._select_own_athlete` (authenticated): the requester's achievement belongs to `auth.uid()`.
- `..._select_club_trainer` (authenticated): `status = 'PENDING'`, and a `club_trainers` row links
  `auth.uid()` to `club_id`.
- There are no INSERT, UPDATE or DELETE policies, so writes are service-role only. All writes go
  through the API.
- The two SELECT policies are OR-composed, and each predicate is narrow on its own. The header
  documents the composition, following the `club_memberships` pattern.
- RLS on `athlete_achievements` stays owner-only (ADR-014). A trainer gets achievement details only
  through the API, which joins in the service.

### D7. Notifications

`NotificationJobData.notificationType` gains two types:
- `CERTIFICATION_REQUESTED`: one job per trainer `userAccountId` of the club; `subjectId` is the
  request id.
- `CERTIFICATION_DECIDED`: one job for the athlete's account; `subjectId` is the request id.

`PUSH_COPY` gets generic Spanish copy that names no club, athlete or achievement. Jobs are enqueued
after the transaction commits. Failures are logged at `warn` and never thrown, following the
`inviteAthlete` notifier pattern in `services/membership.ts`.

### D8. Habeas Data deletion

`deleteAthleteRows` in `services/dataLifecycle.ts` deletes the athlete's certification requests
before the achievements. `verifyDeletion` counts them. The table has foreign keys to the athlete's
achievements and memberships, so leaving it out would block the cascade. That would surface only as
a failed `deletePII` run, not a silent leak, but it is still a hard failure.

## Risks / Trade-offs

- **The trigger's role check depends on Supabase setting `auth.role()` for PostgREST requests.**
  → RLS tests insert and update through the real authenticated client and assert the rejection, so
  a platform change would fail CI.
- **Resetting a verified achievement on edit is silent for direct database edits.** → No supported
  client edits through the database today. When an API edit procedure is added, it must warn the
  athlete first. Tracked as a follow-up, not in scope.
- **Notification fan-out to every trainer of a large club.** → Clubs have a handful of trainers;
  the jobs are id-only and use the existing retry policy.
- **The stored status could drift from the request history** if a future writer forgets to update
  both. → All writes go through `services/certification.ts` and `transitionMembership`. A test
  compares the status with the request history after each flow.
- **Legacy `VERIFIED` rows have no attribution.** They are accepted as-is (proposal) and shown as
  `VERIFIED` with no club.

## Migration Plan

1. Zod schemas, then `schema.prisma`, then `prisma generate` and `prisma validate`. Stop there for
   the user-run `prisma migrate dev --create-only --name add_achievement_certification`.
2. Hand-edit that migration to add:
   - the partial unique index;
   - `UPDATE athlete_achievements SET verification_status = 'UNVERIFIED' WHERE verification_status = 'PENDING'`.
3. The user applies the migration, then runs `psql -f` on the two constraint files and the new
   policy file.
4. Deploy the API.

**Rollback:** drop the triggers, the policy file and the table. Restoring `PENDING` on the migrated
rows isn't needed, because `PENDING` had no meaning before this change.
