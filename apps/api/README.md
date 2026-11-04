# @app/api

Fastify + tRPC v11 backend. Read `AGENTS.md` first; it holds every rule for this app.

## Layout

- `src/router/`: one router file per domain, merged in `src/router/index.ts`
- `src/services/`: business logic used by the routers
- `src/jobs/`: BullMQ workers
- `src/middleware/`: auth, logging and rate limiting
- `src/__tests__/integration/`: integration tests over real HTTP with real Supabase JWTs (`*.int.test.ts`)

## `club` router

Memberships, the trainer roster and the trainer workspace. Admins manage clubs and trainer access through the `admin` router (ADR-017).

| Procedure | Auth | What it does |
|---|---|---|
| `inviteAthlete` | trainer | Invites an athlete to the club. The membership stays `PENDING_ATHLETE_CONFIRMATION` until the athlete answers. |
| `respondToInvitation` | protected | The athlete accepts or rejects an invitation. |
| `leave` | protected | The athlete leaves a club. Open certification requests are cancelled. |
| `listMyMemberships` | protected | The athlete's own memberships in every status. |
| `listRoster` | trainer | `ACTIVE` members plus pending invitations this trainer sent, with the athlete's L0 identity and sport. |
| `listMyTrainerClubs` | protected | The caller's non-revoked trainer assignments at active clubs. Paged by club id. Empty for non-trainers. |
| `getRosterAthlete` | trainer | One roster athlete, under the same filter as `listRoster`. Anyone else is `NOT_FOUND`. |
| `findAthleteToInvite` | trainer | Invite lookup: by name among searchable `ACTIVE` athletes, or by exact slug among all `ACTIVE` athletes. Returns L0 identity and the relation to this club (`MEMBER`, `INVITED_BY_YOU` or `null`) only. |

"trainer" procedures are `trainerProcedure`: they take a `clubId`, answer `NOT_FOUND` for an unknown club, and answer `FORBIDDEN` unless the caller is a non-revoked trainer of an active club. `findAthleteToInvite` is the one trainer read outside the club; see `trainer-access-boundary` in `openspec/specs/`.

## Tests

The integration tests share the dev database and Upstash Redis with the deployed Azure container app. Stop the container app before running them.

```bash
yarn turbo run typecheck test lint --filter=@app/api
```
