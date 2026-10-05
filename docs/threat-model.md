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

## Trust boundaries

- public web client
- mobile client
- trainer portal client (planned)
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
