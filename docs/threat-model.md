# Threat Model

## Critical assets
- Supabase-authenticated user identities
- public athlete profile data
- private profile data
- medical documents in Storage
- `ocrRawOutput`, `ocrParsedData`, and `verifiedData`
- encryption keys / decryption paths
- signed upload/download URLs
- RLS policies
- audit logs

## Trust boundaries
- public web client
- mobile client
- Fastify + tRPC API
- PostgreSQL / Supabase + RLS
- Supabase Storage
- BullMQ workers + Redis
- Anthropic OCR service
- local development and test environments

## Top risks
1. cross-tenant data leakage because of an overly broad RLS policy
2. agent-generated Prisma queries that over-fetch sensitive relations
3. accidental exposure of unverified OCR data in UI/API responses
4. client-side generation or leakage of signed URLs
5. secrets or PII appearing in logs
6. schema drift between Zod, tRPC outputs, and Prisma
7. unauthorized decryption of PII
8. queue/job retries causing duplicate or invalid state transitions
9. direct HTTP self-calls from Next.js Server Components creating brittle architecture and leaking internal endpoints

## Primary mitigations
- one-policy-file-per-table + RLS tests
- `select`-only Prisma queries
- verified-data-only display rule
- `storageRouter` as the only signed URL gateway
- Pino logging with PII bans
- CI compatibility checks between Prisma and Zod types
- server-only `decryptPII()`
- explicit OCR/document state machine
- `createCallerFactory` for server-side Next.js data access
