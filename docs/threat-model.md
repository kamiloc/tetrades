# Threat Model

## Critical assets

- Supabase-authenticated user identities
- public athlete profile data
- private profile data (`*_enc` columns)
- athlete metric entries and the integrity of their attribution
- club membership state and athlete consent
- athlete visibility settings
- encryption keys / decryption paths
- signed upload/download URLs and profile photo originals
- RLS policies
- audit logs
- achievement verification state and its attribution to a club and trainer
- the platform admin role and the club/trainer provisioning it controls (ADR-017)
- trainer invitation emails (L1, redacted after 90 days)

## Trust boundaries

- public web client
- mobile client
- trainer portal client (planned)
- admin portal client (planned; `add-web-portal-shell`)
- Fastify + tRPC API
- PostgreSQL / Supabase + RLS
- Supabase Storage
- BullMQ workers + Redis
- local development and test environments

## Top risks

1. cross-tenant data leakage because of an overly broad RLS policy
2. agent-generated Prisma queries that over-fetch sensitive relations
3. client-side generation or leakage of signed URLs
4. secrets or PII appearing in logs
5. schema drift between Zod, tRPC outputs, and Prisma
6. unauthorized decryption of PII
7. queue/job retries causing duplicate or invalid state transitions
8. direct HTTP self-calls from Next.js Server Components creating brittle architecture and leaking internal endpoints
9. **fabricated metric entries:** a trainer submits metric entries for an athlete who has not confirmed membership, or whose membership belongs to another club
10. **unwanted data association:** a club or trainer invites an athlete the athlete never agreed to join, so the club's name and data become associated with them
11. **visibility bypass:** a stranger reads data through an unfiltered list, search, or roster endpoint when the detail endpoint applies the athlete's visibility settings
12. **trainer privilege creep:** a trainer or club role gaining access to `AthletePrivateProfile` or other L2 data, directly or through a joined query
13. **self-verification:** an athlete marks their own achievement `VERIFIED` by writing `verification_status` directly through the database (owner RLS cannot restrict columns), or a trainer certifies for a club they do not train
14. **admin abuse or compromise (ADR-017):** an admin account reaches athlete data, keeps acting after the owner removes the role, or silently revokes trainers and deactivates clubs
15. **invitation email trust (ADR-017):** someone accepts a trainer invitation with an email they don't control (an unconfirmed address, a JWT `email` claim, or a differently cased duplicate)
16. **forwarded invitation (ADR-017):** an invitee passes the invitation to someone else
17. **stale trainer access (ADR-017):** a revoked trainer, or a trainer of a deactivated club, keeps writing — including a write already in progress when the revocation commits
18. **mixed capacity (ADR-017):** one account is both an athlete and a trainer (or an admin), so trainer authority and athlete data share an identity

## Primary mitigations

- one-policy-file-per-table + RLS tests
- `select`-only Prisma queries
- `storageRouter` as the only signed URL gateway
- Pino logging with PII bans
- CI compatibility checks between Prisma and Zod types
- server-only `decryptPII()` with mandatory audit
- `createCallerFactory` for server-side Next.js data access
- metric writes require an `ACTIVE` membership checked at write time in the service layer, RLS, and a DB trigger; entries record the reporting trainer and are append-only (risks 9, 12)
- memberships are effective only after athlete confirmation; pending ones are invisible to others (risk 10)
- visibility rules are applied in a shared service used by every list and detail procedure; RLS on club and metric tables grants only the athlete and active-club trainers, which is stricter than any audience; missing settings resolve to most restrictive (risk 11)
- no trainer or club role, procedure, or policy touches L2 data; covered by deny-tests (risk 12)
- list-vs-detail consistency tests (risk 11)
- verification status is written only by the API certification service; a DB trigger rejects end-user writes to `verification_status` / `verification_source` and resets edited `VERIFIED` rows; certification requests have no client write policies, their lifecycle is enforced by a trigger, and decisions require the trainer's own club plus an `ACTIVE` membership at decision time (risk 13, ADR-016)
- `adminProcedure` re-reads `UserAccount.role` on every call (never the rate-limit cache); no procedure writes `role`, reads athlete or L2 data, or touches legal holds; every admin write is recorded in the append-only `admin_action_log` (no client access), and revocation and deactivation are reversible (risk 14, ADR-017)
- the API matches invitations only to a session email Supabase reports confirmed (`email_confirmed_at`), lowercased; no RLS policy trusts the JWT `email` claim and clients can't read invitations at all; a lowercase CHECK and a `(club_id, lower(email))` partial unique index guarantee one pending invitation per club and address (risk 15). Trust assumption: a confirmed email proves inbox ownership; the project keeps "Confirm email" and "Secure email change" on, but the API check doesn't depend on them
- invitations expire after 14 days, acceptance requires the invited confirmed inbox, and admins see each invitation's state and can revoke it (risk 16)
- revoked and deactivated trainer access is denied in `requireClubTrainer`, in every RLS trainer subquery (`club_is_active()`), and in the metric-entry trigger; trainer writes lock the club and trainer rows in a global order (club → club_trainer → membership → achievement → request), so a write either commits before the revocation or fails (risk 17)
- one capacity per account is enforced by the API (`athlete.bootstrap`, invitation accept) and by `account_single_capacity.sql` triggers for every writer (risk 18)

