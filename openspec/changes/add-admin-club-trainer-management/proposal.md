# Proposal

## Why

Clubs and trainers can only be created out-of-band today (`club.ts`: "there is no create procedure"). So the trainer portal (Change 5) has nobody to serve, and certification (ADR-016) depends on clubs nobody can manage safely. A small, trusted admin role is needed to create clubs, give trainers access, and take access away. This change builds the backend for it: schema, database rules, API, deletion and retention, notifications, and docs. The web screens follow in `add-web-portal-shell`.

## What Changes

- **Admin role.** `UserRole` gains `ADMIN`. Admins are dedicated accounts. The project owner invites the email in Supabase and sets `role = 'ADMIN'` with SQL; no procedure grants or removes the role. Admins sign in like everyone else (Supabase Magic Link, OTP fallback), so there are no passwords.
- **`adminProcedure`.** A new procedure base that reads `UserAccount.role` fresh from `ctx.userId` on every call. The rate limiter's cached role stays for rate-limit tiers only. `ADMIN` joins `SYSTEM` in the admin rate-limit tier.
- **One capacity per account.** An account is an athlete, a trainer, or an admin, never two of them. A person who needs two roles uses two accounts with two emails.
  - `athlete.bootstrap` rejects admins and any account with trainer rows.
  - Accepting a trainer invitation rejects athletes and admins.
  - A database trigger enforces the same rule for every writer.
- **Club administration:**
  - Admins create clubs and edit their name, country and city. The slug is set at creation and never changes.
  - Clubs are **never deleted**, only deactivated (`Club.deactivatedAt`).
  - Deactivating a club ends trainer access at once. In the same transaction it cancels the club's `PENDING` certification requests (achievements back to `UNVERIFIED`), closes `PENDING` athlete invitations (`REJECTED`, with a push that names no club) and revokes `PENDING` trainer invitations.
  - `ACTIVE` memberships stay `ACTIVE`, because only the athlete ends a membership (ADR-013). Every club output carries an `isActive` flag, so the UI labels the club inactive.
  - Admins can reactivate a club; whatever was cancelled stays cancelled.
  - Clients can no longer read `clubs.deactivated_at` or `clubs.created_at` (both L1) directly from the database.
- **Trainer provisioning:**
  - An admin invites a trainer by email to one club, creating a `ClubTrainerInvitation` in `PENDING` with a 14-day expiry. No email is sent; the admin tells the invitee to sign in on the trainer portal with that address.
  - The API accepts the session email only when Supabase reports it **confirmed**, and matches it case-insensitively. The invitee accepts or declines, and accepting creates the `ClubTrainer` row.
  - Clients can't read invitations from the database at all.
  - The database guarantees one `PENDING` invitation per club and lowercased email.
  - Admins can revoke a pending invitation or an active trainer. Revoking a trainer sets `ClubTrainer.revokedAt` and never deletes the row, so past metric entries and certification decisions stay attributed.
- **Revocation and deactivation cut access on every path.**
  - `requireClubTrainer` rejects revoked trainers and deactivated clubs.
  - RLS policies and the metric-entry trigger do the same.
  - Trainer writes lock the club row and their own trainer row inside the transaction, so a revocation or deactivation that commits first makes them fail.
- **Admin action log.** A new append-only `admin_action_log` table records every admin write: actor, action, target, `requestId`, metadata (no emails, no L2) and time. Only the API's database connection inserts; client roles get no access. `audit_log` is not changed.
- **Retention and deletion.**
  - A scheduled job (the project's first) redacts the email of trainer invitations that ended more than 90 days ago.
  - `deletePII` revokes and redacts trainer invitations addressed to the deleted athlete's email, and verifies none remain.
- **Admin boundary.** Admins manage clubs and trainer invitations only. They never read L2 data, private profiles, athlete lists, metrics, certifications or `audit_log`, and they never set or clear a legal hold.
- **Mobile:**
  - The Clubs tab labels inactive clubs.
  - Onboarding tells a trainer account to use the web portal.
- **ADR-017** records the admin role, one capacity per account, trainer provisioning, the club lifecycle, retention, and the one membership change ADR-013 doesn't cover: club deactivation closes pending invitations.

### Out of scope

- **All web UI** (sign-in, cookie sessions, the tRPC proxy, Tailwind, admin pages, `/trainer/invitations`). That's the next change, `add-web-portal-shell`, which depends on this one.
- **From the prototype:** club applications and the approval queue, verification checklist and documents, recent-activity and audit feeds, the trainer's full name, role, View/Log/Verify permissions and credential upload, global search, exports.
- **The trainer portal itself** (club picker, roster, athlete invites, certification inbox, metric entry), in `add-trainer-portal`.
- **Self-service deletion for trainer-only accounts.** `requestDeletion` requires an athlete profile, and since every trainer is now a trainer-only account, trainers can't delete their accounts in the app. ADR-017 records this as a known gap that the owner handles manually until a dedicated change designs it, keeping reported entries attributable.
- **Email delivery** of trainer invitations.

## Capabilities

### New Capabilities
- `platform-admin-access`: the `ADMIN` role, one capacity per account, how admin authority is checked and bounded, and the append-only admin action log.
- `club-administration`: creating and editing clubs, immutable slugs, deactivation with its cascade, reactivation, and the inactive flag.
- `trainer-provisioning`: trainer invitations by email, their lifecycle and expiry, acceptance by confirmed email, revocation (including writes already in progress), and the 90-day email redaction.

### Modified Capabilities
- `trainer-access-boundary`: a user is a trainer of a club only through a non-revoked `ClubTrainer` row of an active club.
- `club-membership`: athletes can't be invited to a deactivated club, and deactivating a club closes its pending invitations (a system transition alongside the athlete's own reject).
- `achievement-certification`: athletes can't request certification from a deactivated club, and deactivation cancels the club's open requests, like leaving the club does.
- `mobile-club-membership-view`: inactive clubs are labelled.
- `athlete-data-lifecycle`: deleting an athlete closes and redacts trainer invitations addressed to their email.
- `membership-notifications`: athletes are told when a club invitation is closed, and revoked trainers get no certification notifications.

## Impact

- **Schema (Zod first, then Prisma; the owner runs the migration):**
  - `UserRole.ADMIN`
  - `Club.deactivatedAt`
  - `ClubTrainer.revokedAt`
  - new `ClubTrainerInvitation` with a lowercase CHECK and a `lower(email)` partial unique index
  - new `AdminActionLog`
- **Database rules:**
  - new constraint files: invitation transitions, one capacity per account, invitation uniqueness
  - extended metric-entry trigger
  - a `public.club_is_active()` `SECURITY DEFINER` helper
  - column-level SELECT grants on `clubs`
  - new policy files for `club_trainer_invitations` and `admin_action_log` (no client policies)
  - narrowed trainer subqueries in `club_memberships`, `athlete_metric_entries` and `achievement_certification_requests`

  All of these need owner confirmation, and the full `tests/rls/` suite must be re-run.
- **API:**
  - New `admin` and `trainerInvitation` routers, which need approval as new routers.
  - `adminProcedure`.
  - `requireClubTrainer`, `inviteAthlete`, `reportEntry`, `requestCertification`, `decideCertification` and `athlete.bootstrap` changes.
  - New raw-SQL locks (`lockActiveClub`, `lockActiveTrainer`), which need approval.
  - `middleware/auth.ts` and `context.ts` carry the confirmed email.
  - `rateLimit.ts` `ADMIN_ROLES`.
  - `dataLifecycle.ts` (deletion and verification).
  - A new redaction worker in `apps/api/src/jobs/`.
- **Packages:**
  - `@packages/validators`: new and changed schemas.
  - `@packages/auth`: `verifyAccessToken` returns the email only when confirmed.
  - `@packages/queue`: redaction job payload and queue, `CLUB_INVITATION_CLOSED` notification type.
  - `@packages/api-client`: admin and invitation hooks.
  - `@packages/shared-logic`: invitation state helper.
- **Tests:** the RLS and integration test helpers that make athlete users trainers switch to trainer-only accounts.
- **Mobile:**
  - `apps/mobile/app/(app)/(tabs)/clubs.tsx`: inactive label.
  - The onboarding error copy for trainer accounts.
- **Docs:**
  - ADR-017 and `docs/adr/README.md`
  - `docs/pii-access-matrix.md`
  - `docs/threat-model.md`
  - `docs/data-classification.md`
  - `docs/project-architecture.md`
  - the AGENTS.md Habeas Data checklist (trainer invitation retention)
- **Design handoff:** `docs/design-handoff/web/`, `WEB-AUDIT.md`, and the README and CHANGELOG edits are uncommitted. They're committed with this change, since `add-web-portal-shell` builds on them.
