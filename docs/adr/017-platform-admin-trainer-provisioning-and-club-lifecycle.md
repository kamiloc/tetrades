# ADR-017: Platform Admin, Trainer Provisioning, and Club Lifecycle

- **Status:** Accepted
- **Date:** 2026-11-03
- **Amends:** [ADR-013](013-pivot-clubs-metrics-trainer-portal-and-visibility.md) §5, only to add a system-initiated path to `REJECTED` (club deactivation) and to state that `ACTIVE` memberships survive deactivation
- **Related:** [ADR-014](014-achievement-visibility-default.md) (admins get no extra achievement access), [ADR-016](016-achievement-certification-by-club-trainers.md) (deactivation cancels open certification requests, like leaving a club)
- **Built by:** openspec change `add-admin-club-trainer-management`

## Context

Clubs and trainers could only be created out-of-band (seed scripts, service role). The trainer portal had nobody to serve, and certification (ADR-016) depended on clubs that nobody could manage safely. A small, trusted admin role is needed to create clubs, give trainers access, and take access away, without ever becoming a path to athlete data.

## Decision

### 1. `ADMIN` is a role set only by the owner; authority is re-read on every call

- `UserRole` gains `ADMIN`. Admins are dedicated accounts. The project owner invites the email in Supabase Auth, then runs `UPDATE user_accounts SET role = 'ADMIN' WHERE supabase_user_id = '<id>';`. No procedure, page or job writes `role`.
- Admins sign in like everyone else (Magic Link, OTP fallback). No passwords.
- `adminProcedure` loads `UserAccount.role` for `ctx.userId` with an uncached `select` on every call and throws `FORBIDDEN` unless it is `ADMIN`. The rate limiter's 60-second cached role is used for rate-limit tiers only; `ADMIN` joins `SYSTEM` in the admin tier.

### 2. Admin authority is limited to clubs and trainer access

Admins create, edit, deactivate and reactivate clubs, and invite and revoke trainers. They never read or write L2 data, private profiles, athlete lists beyond what any user sees, metric entries, certification requests, visibility settings or `audit_log`, and they never set or clear a legal hold. The admin router has no procedure for any of these.

### 3. One capacity per account

An account is at most one of: an athlete (has an athlete profile), a trainer (has `ClubTrainer` rows, active or revoked), or an admin (role `ADMIN`). A person who needs two capacities uses two accounts with two emails.

- `athlete.bootstrap` rejects admin, system and trainer accounts (`FORBIDDEN`; trainer accounts are told to use the web portal).
- Accepting a trainer invitation rejects athlete and admin accounts (`FORBIDDEN`).
- `supabase/constraints/account_single_capacity.sql` enforces the rule for every writer with `BEFORE INSERT OR UPDATE OF user_account_id` triggers on `club_trainers` and `athletes`. They lock the `user_accounts` row first, so two concurrent inserts serialize. They are `SECURITY DEFINER`, so the check sees every row regardless of the writer's RLS view.
- *Rejected:* a `TRAINER` role. Trainer authority is per club and comes from `ClubTrainer` rows (ADR-013 §4); a global role would duplicate it and could disagree with it.

### 4. Trainer provisioning by confirmed email

- An admin invites an email to one club, creating a `ClubTrainerInvitation` in `PENDING` that expires after 14 days. No email is sent; the admin tells the invitee to sign in on the trainer portal with that exact address.
- Lifecycle: `PENDING → ACCEPTED | DECLINED | REVOKED`; the other states are terminal. "Expired" is derived (`PENDING` and `expires_at <= now()`), never stored. `supabase/constraints/club_trainer_invitation_transitions.sql` enforces this for every writer and keeps the identifying columns and `expires_at` immutable.
- At most one `PENDING` invitation per club and email, case-insensitively, guaranteed by the database: `CHECK (email = lower(email))` and `UNIQUE (club_id, lower(email)) WHERE status = 'PENDING'` (migration `20261103020215_add_trainer_invitation_open_unique`). Inviting closes an expired `PENDING` row for the same pair first.
- The invitee lists, accepts or declines through the `trainerInvitation` router. The API matches the session email only when Supabase reports it confirmed (`email_confirmed_at` set), compared lowercased. A wrong, unconfirmed or missing email, an expired or closed invitation, or a deactivated club all answer `NOT_FOUND`, so invitation ids can't be probed. `FORBIDDEN` is reserved for "this account can't be a trainer".
- Accepting upserts `ClubTrainer(clubId, userAccountId)`, clearing `revokedAt` on an existing revoked row ("return after revocation"), so there is one row per club and user.
- Clients can't read invitations from the database at all: `club_trainer_invitations` has FORCE RLS, no client policies, and no client privileges.

**Trust assumption.** A confirmed email proves inbox ownership. With Magic Link and OTP as the only sign-in methods, confirmation happens by completing the link or code. The project keeps Supabase's "Confirm email" and "Secure email change" settings on, but the API does not rely on that alone: the `email_confirmed_at` check holds even if a user is created unconfirmed or a setting is turned off. The JWT `email` claim is never trusted, which is why no RLS policy matches on it.

### 5. Revocation and the club lifecycle

- **Revoking a trainer** sets `ClubTrainer.revokedAt`. The row is never deleted, so past metric entries and certification decisions stay attributed.
- **Clubs are never deleted, only deactivated** (`Club.deactivatedAt`). In the same transaction, deactivation:
  - cancels the club's `PENDING` certification requests (achievements back to `UNVERIFIED`),
  - closes its `PENDING_ATHLETE_CONFIRMATION` memberships as `REJECTED`, with a push to each athlete that names no club,
  - revokes its `PENDING` trainer invitations.
- `ACTIVE` memberships stay `ACTIVE` (only the athlete ends a membership, ADR-013), and metric entries, `VERIFIED` achievements and trainer rows are unchanged. The athlete can still leave.
- **Reactivation** clears `deactivatedAt` and restores access for non-revoked trainers. Whatever the deactivation cancelled, rejected or revoked stays that way.
- **Outputs.** Every non-admin club output carries the derived L0 `isActive`; the timestamps (L1) appear only in admin outputs. Clients can no longer read `clubs.deactivated_at` or `clubs.created_at` directly: `clubs.sql` replaces the table SELECT grant with a grant on `id, slug, name, country_code, city`.

**Amendment to ADR-013 §5.** Besides the athlete's own rejection, a `PENDING_ATHLETE_CONFIRMATION` membership also becomes `REJECTED` when its club is deactivated. This is a system-initiated transition; no club or trainer can reject on the athlete's behalf. The allowed edges are unchanged.

### 6. Revocation and deactivation cut access on every path

A user is a trainer of a club only through a non-revoked `ClubTrainer` row of an active club.

- **API:** `requireClubTrainer` throws one `FORBIDDEN` message for a missing row, a revoked row or a deactivated club. The certification-request notification skips revoked trainers.
- **RLS:** every `club_trainers` subquery in `club_memberships`, `athlete_metric_entries` and `achievement_certification_requests` adds `ct.revoked_at IS NULL AND public.club_is_active(ct.club_id)`. `club_is_active()` is a `STABLE SECURITY DEFINER` helper with a pinned `search_path`, because policies run with the caller's privileges and can no longer read `deactivated_at`.
- **Trigger:** `athlete_metric_entry_active_membership.sql` rejects entries from a revoked trainer or a deactivated club for every writer.
- **Writes in progress:** the global lock order is **club → club_trainer → membership → achievement → request**. Trainer writes (`inviteAthlete`, `reportEntry`, `decideCertification`) lock the club and their trainer row `FOR SHARE` first inside their transaction; `requestCertification` and invitation acceptance lock the club. `deactivateClub` locks the club `FOR UPDATE`; `revokeTrainer` locks the club `FOR SHARE`, then the trainer row `FOR UPDATE`. A write therefore either commits before the revocation or deactivation (which waits for its lock), or re-reads the row afterwards and fails. Reads already past `requireClubTrainer` may finish.

### 7. Admin action log

`admin_action_log` records every successful admin write: actor, action (`AdminAction`), target type and id, `requestId`, metadata and time. It is written in the same transaction as the write, so a rolled-back write leaves no row. Metadata holds ids, counts and changed field names only, never an email, a field value or L2 data. Only the API's connection inserts (on Supabase the `postgres` role has `rolbypassrls = true`, verified 2026-11-01); client roles have no policies and no privileges, so no client, admins included, can read or change a row. Retained 5 years like `audit_log`; that purge joins the tombstone-purge follow-up. `audit_log` is unchanged: it requires a subject athlete.

### 8. Retention and deletion

- **90-day redaction.** A scheduled job (`trainer-invitation-redaction`, the project's first recurring job, registered with BullMQ's `upsertJobScheduler` at API startup) replaces the email of every invitation that ended more than 90 days ago with `redacted:<id>` and sets `redactedAt`. That covers declined or revoked invitations by `respondedAt`, expired pending ones by `expiresAt`, and accepted ones 90 days after their trainer row is revoked. An accepted invitation keeps its email while its trainer is active. Re-running changes nothing.
- **Athlete deletion.** `deletePII` reads the auth user's confirmed email before deleting the auth user. In the deletion transaction it revokes every `PENDING` invitation to that email and redacts every invitation carrying it. `verifyDeletion` treats any invitation still carrying the email as residue, and the request ends `FAILED`. The email stays in memory only and is never logged. An athlete account never holds `ClubTrainer` rows (§3), so deletion has no trainer records to handle.

## Known gap: trainer-only accounts can't self-delete

`requestDeletion` requires an athlete profile, and every trainer is now a trainer-only account, so trainers cannot delete their accounts in the app. Until a dedicated change designs trainer self-deletion, the project owner handles these Habeas Data requests manually, through the break-glass process (AGENTS.md):

1. Revoke the person's trainer assignments (`club_trainers.revoked_at = now()`). Keep the rows: they anchor other athletes' metric entries and certification decisions.
2. Redact every trainer invitation addressed to, or accepted by, the person (`email = 'redacted:' || id`, `redacted_at = now()`; revoke any still `PENDING`).
3. Delete the Supabase auth user.
4. Tombstone the account (`user_accounts.supabase_user_id = 'deleted:' || id`, `status = 'DEACTIVATED'`), and remove its device tokens.
5. Record the operation in `audit_log` as break-glass access with the support ticket's `requestId`.

## Consequences

- Clubs and trainers can be managed without database access, and every admin write is recorded.
- The admin role can't reach athlete data: it has no procedures for it, and the trainer-only, athlete-only and admin-only capacities are separated in the database.
- A compromised admin account can revoke trainers and deactivate clubs, but both are reversible and logged, and it gains no athlete or L2 access.
- An invitation forwarded to someone else is useless without the invited, confirmed inbox; it also expires after 14 days, and the admin can revoke it.
- Direct client reads of `clubs` must name the five public columns; `select *` from a client now fails.
- Trainer writes take two extra `FOR SHARE` locks on rows that are rarely written.
- Test helpers create trainers as dedicated trainer-only accounts.

## Required tests

- RLS: `club_trainer_invitations` (transitions, uniqueness, no client access), `admin_action_log` (no client access), `clubs` column grants, revoked-trainer and deactivated-club deny cases on `club_memberships`, `athlete_metric_entries` and `achievement_certification_requests`, and the one-capacity triggers.
- API: `adminProcedure` (fresh role), every admin and invitation procedure (success, invalid input, 401, 404, 403), the deactivation cascade, revocation of in-flight writes (lock order), bootstrap capacity checks, deletion redaction and verification, and the redaction schedule.
