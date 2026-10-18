# ADR-016: Achievement Certification by Club Trainers

- **Status:** Accepted
- **Date:** 2026-10-15
- **Partially supersedes:** [ADR-014](014-achievement-visibility-default.md), only the clause "Trainers get no extra access through club membership", and only for certification requests made to the trainer's own club
- **Built by:** openspec change `add-achievement-certification`

## Context

Achievements are the core of a public athlete profile, but "verified" had no trustworthy meaning.

- The only way to verify was a SYSTEM-only procedure. It recorded no actor and could not reject.
- `addAchievement` marked every new achievement `PENDING`, but nobody was asked to review it.
- The owner-only RLS policies on `athlete_achievements` let an athlete insert or update any column. That included `verification_status`, so athletes could mark their own achievements `VERIFIED`.

Clubs and trainers already vouch for athletes through metric entries, under the consent model of ADR-013. The project owner decided on 2026-10-14 that certification should work the same way.

## Decision

### Who certifies

- An athlete sends one of their achievements to **one club where they have an `ACTIVE` membership**.
- Only trainers of that club (`ClubTrainer` rows) can see the request and approve or reject it.
- Rejecting requires a reason.
- The `ACTIVE` membership is checked both when the request is made and when the trainer decides.
- No admin, federation, or SYSTEM path remains. `achievement.verifyAchievement` is removed.

### Model

`AchievementCertificationRequest` holds requests in four states: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

- At most one request per achievement can be `PENDING` (a partial unique index).
- Each decision records the deciding trainer and the time.
- The other three states are terminal.

`AthleteAchievement.verificationStatus` is a summary that only the API's certification flow writes:

| Request state | Achievement status |
| --- | --- |
| no request is open | `UNVERIFIED` |
| `PENDING` | `PENDING` |
| `APPROVED` | `VERIFIED` |
| `REJECTED` | `REJECTED` |
| `CANCELLED` | `UNVERIFIED` |

New achievements start `UNVERIFIED`.

### Lifecycle

- **Withdrawing.** The athlete can withdraw a pending request, which makes it `CANCELLED`.
- **Asking again.** After a rejection or cancellation, the athlete can request again, from the same club or another one.
- **Leaving a club.** The club's open requests are cancelled in the same transaction.
- **After leaving.** Achievements the club already certified stay `VERIFIED`. A certification records a past fact, just as ADR-013 keeps metric entries after a membership is `COMPLETED`.

### Integrity

These rules are enforced in the database, not only in the API.

- **Request lifecycle.** A trigger, `supabase/constraints/achievement_certification_transitions.sql`, applies to every writer.
- **End-user writes.** A second trigger, `supabase/constraints/achievement_verification_integrity.sql`, applies to end users (`anon`, `authenticated`):
  - an inserted achievement must be `UNVERIFIED`;
  - nobody can change verification status or source directly;
  - editing the title, organization, or date of a `VERIFIED` achievement resets it to `UNVERIFIED`;
  - those facts cannot be edited while the achievement is `PENDING`, so a trainer never approves facts they did not review. The athlete withdraws the request first.
- **Concurrency.** Every writer locks rows in one order: membership, then achievement, then request. A request or decision locks the `ACTIVE` membership (`FOR SHARE`), so a concurrent `leaveClub` either waits or wins and makes the check fail. A request locks the achievement, so it never misses a concurrent approval.
- **Writes to the request table.** It has no write policies: every write goes through the API.

### Trainer access (supersedes the ADR-014 clause)

- A trainer can read a certification request only while it is `PENDING` and was made to their own club.
- From such a request the trainer sees the achievement's title, organization, and date, and the athlete's L0 identity. This applies through the API and through the RLS SELECT policy on `achievement_certification_requests`.
- Trainers still get **no** extra access to the athlete's achievement list: `listAchievements` still follows only the achievements audience.
- RLS on `athlete_achievements` stays owner-only.
- Trainers never read L2 data (ADR-013 §4).

### Public attribution

- Achievement reads include the certifying club's name: the club of the most recent approval, and only while the achievement is `VERIFIED`.
- A certification reveals a club association. So a caller other than the athlete sees the club only when the athlete's **club-memberships** audience also admits them. Otherwise they see just `VERIFIED`.
- The owner always sees the club.
- Achievements verified before this change have no certifying club ("legacy").

### Notifications

Push notifications carry identifiers only and fixed copy that names no athlete, club, achievement, or reason.

- When a request is made, the club's trainers are notified.
- When a decision is made, the athlete is notified.
- A failed notification never fails the request or the decision.

## Consequences

- Every new `VERIFIED` achievement can be traced to a club and a trainer.
- Deleting an athlete (`deletePII`) removes their certification requests and checks that none remain.
- Deleting an achievement deletes its request history with it (`ON DELETE CASCADE`).
- The trainer portal (Change 5) and the athlete screens (Change 8) can build on these procedures: `requestCertification`, `withdrawCertification`, `listMyCertificationRequests`, `listPendingCertifications`, and `decideCertification`.
- An API procedure for editing achievements doesn't exist yet. When one is added, it must warn the athlete before an edit removes a verification.
