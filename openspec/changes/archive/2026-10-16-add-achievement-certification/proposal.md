# Proposal

## Why

Achievements are the core of an athlete's public profile, but "verified" doesn't mean anything yet.
- The only way to verify one is the SYSTEM-only `achievement.verifyAchievement`, which records no
  actor and can't reject.
- `addAchievement` marks every achievement `PENDING` without asking anyone to review it.
- An athlete can mark their own achievement `VERIFIED`. The `athlete_achievements` RLS policies let
  the owner insert or update any column, including `verification_status`.

This change makes verification mean something: the athlete sends an achievement to one of their
clubs, and a trainer of that club certifies or rejects it. The flow uses the same consent model that
already governs club memberships and metric entries (ADR-013).

## What Changes

- **Certification requests.** A new `AchievementCertificationRequest` model and table.
  - Statuses: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
  - Each request is tied to the club the athlete chose, and the decision is attributed to the
    deciding `ClubTrainer`.
  - An achievement has at most one `PENDING` request at a time.
- **Athlete actions.** An athlete can:
  - request certification of their own achievement from a club where they have an `ACTIVE`
    membership;
  - withdraw a pending request;
  - list their requests, including any rejection reason.
- **Trainer actions.** A trainer of that club can list the requests pending for the club and
  approve or reject them, giving a reason when rejecting. The `ACTIVE` membership is checked again
  when the trainer decides.
- **Status summary.** `AthleteAchievement.verificationStatus` becomes a summary of the requests,
  written only by the certification service:
  - `UNVERIFIED` when no request is open, `PENDING` while one is open.
  - `VERIFIED` once approved, `REJECTED` once rejected.
- **New achievements** start as `UNVERIFIED`, not `PENDING`.
- **Leaving a club.** When an athlete leaves a club (`ACTIVE → COMPLETED`), that club's open
  requests are cancelled in the same transaction. Achievements the club already certified stay
  `VERIFIED`.
- **Club attribution on reads.**
  - Achievement reads add the certifying club's name.
  - Non-owners see it only when the athlete's club-memberships audience also admits them, so
    certification never reveals a club the athlete has hidden.
  - The owner always sees it.
- **Integrity trigger.** A database trigger stops end users (anon and authenticated) from setting or
  changing `verification_status` or `verification_source`. It also resets a `VERIFIED` achievement
  to `UNVERIFIED` if its title, organization, or date is edited directly.
- **Notifications.** Two new push notification types, with identifiers only in their payloads:
  - the club's trainers are told about a new request;
  - the athlete is told about the decision.
- **BREAKING:** `achievement.verifyAchievement` (SYSTEM-only) and `verifyAchievementInput` are
  removed. Certification by a club trainer becomes the only way to verify an achievement.
- **Data migration.**
  - Existing `PENDING` achievements, which have no request behind them, become `UNVERIFIED`.
  - Existing `VERIFIED` achievements stay verified, with no certifying club (legacy).

## Capabilities

### New Capabilities
- `achievement-certification`: the certification request lifecycle, who may request and decide,
  the `ACTIVE`-membership gate, attribution, how leaving a club affects requests and
  certifications, and the rule that only the certification flow can change an achievement's
  verification status.

### Modified Capabilities
- `athlete-visibility`: two requirements change.
  - **Achievement reads expose only public fields** gains the certifying club, which non-owners
    see only when the club-memberships audience admits them.
  - **Achievement reads are filtered by audience** keeps "no extra trainer access" for profile
    reads. Reviewing requests submitted to the trainer's club is a separate surface, defined in
    `achievement-certification`.
- `trainer-access-boundary`: **Trainers read only club-scoped data** grows to include
  certification requests submitted to the trainer's club while they are `PENDING`.
- `membership-notifications`: new requirements notify the club's trainers of a certification
  request and the athlete of the decision. The identifiers-only payload rule still applies.

## Impact

- **Schema:**
  - New `AchievementCertificationRequest` model and `CertificationRequestStatus` enum, with
    relations on `AthleteAchievement`, `Club`, `ClubMembership` and `ClubTrainer`.
  - A user-run migration that also turns `PENDING` achievements into `UNVERIFIED`.
  - Zod schemas in `@packages/validators`.
- **Database:**
  - `supabase/policies/achievement_certification_requests.sql`: new RLS policies (the athlete
    reads their own requests; the club's trainers read their club's pending requests; writes are
    service-role only).
  - `supabase/constraints/`: the integrity trigger on `athlete_achievements`, and a partial unique
    index allowing one `PENDING` request per achievement.
- **API:**
  - The `achievement` router loses `verifyAchievement` and gains five procedures:
    `requestCertification`, `withdrawCertification`, `listMyCertificationRequests`,
    `listPendingCertifications` and `decideCertification`.
  - A new `services/certification.ts`.
  - `services/membership.ts`: leaving a club cancels its open requests.
  - `services/achievements.ts`: reads gain the club attribution.
- **Queue and notifications:** `packages/queue` notification types, and `PUSH_COPY` in
  `services/notifications.ts`.
- **Client:** `@packages/api-client` hooks.
- **Seed:** realistic Colombian requests in every state.
- **Docs:**
  - An amendment to ADR-014 (trainer read exception), plus updates to the PII access matrix, threat
    model, ERM, project architecture and SPRINT_PLAN Change 7.
  - The ADR-014 trainer read exception widens trainer access, so it needs explicit confirmation
    under AGENTS.md before it is implemented.
- **Tests:**
  - RLS deny-tests for the new table and the trigger.
  - Integration tests for each procedure (success, invalid input, 401, 404, FORBIDDEN for another
    club and for non-`ACTIVE` memberships).
  - A list/detail parity test for the club attribution.
- **Mobile and web UI are out of scope:** Change 8 (athlete screens) and Change 5 (trainer portal).
