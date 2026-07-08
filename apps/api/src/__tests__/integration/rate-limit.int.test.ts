/**
 * Rate limiting integration (task 3.9 × task 3.7) — real tiered limits on
 * the real server, counted against real requests.
 *
 * The public-tier burst uses the production default (60/min). The
 * authenticated and admin tiers are exercised with lowered env-driven
 * maximums on dedicated server instances: proving "200 in a minute then a
 * 429" (or 2000 for admin) would need thousands of live Supabase JWT
 * verifications per run, while tier selection, per-user bucketing, and
 * 429 shaping — the integration behaviour — are identical at any maximum.
 * The 60/200/2000 production values themselves are pinned by the env unit
 * tests in src/__tests__/rate-limit.test.ts.
 */
import './helpers/load-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  authReady,
  cleanupAuthedUser,
  createAuthedUser,
  dbReady,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

interface TrpcErrorEnvelope {
  error: { json: { code: number; data: { code: string; httpStatus: number } } };
}

async function callSportList(url: string, accessToken?: string): Promise<Response> {
  return fetch(`${url}/trpc/sport.list`, {
    headers: accessToken === undefined ? {} : { authorization: `Bearer ${accessToken}` },
  });
}

describe.skipIf(!dbReady)('public tier — production default limit', () => {
  let server: TestServer;

  beforeAll(async () => {
    // No overrides: RATE_LIMIT_PUBLIC falls back to the production default
    // of 60/min. A dedicated server instance guarantees a fresh IP bucket.
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('allows 60 unauthenticated requests, then 429s the 61st with a tRPC-shaped error', async () => {
    for (let i = 1; i <= 60; i++) {
      const res = await callSportList(server.url);
      expect(res.status, `request ${i} of 60 should pass`).toBe(200);
    }

    const limited = await callSportList(server.url);
    // Success criterion: correct HTTP status code on the wire.
    expect(limited.status).toBe(429);

    const body = (await limited.json()) as TrpcErrorEnvelope;
    expect(body.error.json.data.code).toBe('TOO_MANY_REQUESTS');
    expect(body.error.json.data.httpStatus).toBe(429);
    expect(body.error.json.code).toBe(-32029);
  });
});

describe.skipIf(!authReady)('authenticated and admin tiers — per-user buckets', () => {
  let server: TestServer;
  let userA: AuthedUser;
  let userB: AuthedUser;
  let admin: AuthedUser;

  const AUTHED_MAX = 5;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: AUTHED_MAX, admin: 2000 });
    // sport.list needs no athlete row; withAthlete false keeps setup fast.
    userA = await createAuthedUser({ withAthlete: false, label: 'rlA' });
    userB = await createAuthedUser({ withAthlete: false, label: 'rlB' });
    admin = await createAuthedUser({ withAthlete: false, role: 'SYSTEM', label: 'rlAdmin' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(userA);
    await cleanupAuthedUser(userB);
    await cleanupAuthedUser(admin);
    await server.close();
  });

  it('enforces the per-user authenticated limit without leaking across users', async () => {
    for (let i = 1; i <= AUTHED_MAX; i++) {
      const res = await callSportList(server.url, userA.accessToken);
      expect(res.status, `user A request ${i} within limit`).toBe(200);
    }

    const limited = await callSportList(server.url, userA.accessToken);
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as TrpcErrorEnvelope;
    expect(body.error.json.data.code).toBe('TOO_MANY_REQUESTS');

    // A different verified user has an untouched bucket.
    const other = await callSportList(server.url, userB.accessToken);
    expect(other.status).toBe(200);
  });

  it('does not limit a SYSTEM (admin-tier) user at the authenticated threshold', async () => {
    for (let i = 1; i <= AUTHED_MAX * 2; i++) {
      const res = await callSportList(server.url, admin.accessToken);
      expect(res.status, `admin request ${i} must not be throttled`).toBe(200);
    }
  });
});
