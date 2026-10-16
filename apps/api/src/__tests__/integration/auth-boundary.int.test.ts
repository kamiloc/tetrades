/**
 * Auth boundary (task 3.9) — public vs protected procedures against the real
 * server, real Supabase JWT verification, no auth mocks.
 */
import './helpers/load-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupTestClub,
  createAuthedUser,
  createTestClub,
  createTestSport,
  dbReady,
  deleteTestSport,
  expectTRPCCode,
  invalidateAuthUser,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

describe.skipIf(!dbReady)('auth boundary — no credentials required', () => {
  let server: TestServer;

  beforeAll(async () => {
    // High tier limits: this group is about auth, not throttling.
    server = await startServer({ public: 100_000, authenticated: 100_000 });
  });

  afterAll(async () => {
    await server.close();
  });

  it('publicProcedure is reachable without a JWT', async () => {
    const sports = await apiClient(server.url).sport.list.query();
    expect(Array.isArray(sports)).toBe(true);
  });

  it('protectedProcedure returns UNAUTHORIZED without a JWT', async () => {
    await expectTRPCCode(apiClient(server.url).athlete.getMyAthlete.query(), 'UNAUTHORIZED');
  });

  it('protectedProcedure returns UNAUTHORIZED with a malformed token', async () => {
    await expectTRPCCode(
      apiClient(server.url, 'not-a-real-jwt').athlete.getMyAthlete.query(),
      'UNAUTHORIZED',
    );
  });
});

describe.skipIf(!authReady)('auth boundary — real Supabase JWTs', () => {
  let server: TestServer;
  let sportId: string;
  let user: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    user = await createAuthedUser({ sportId, label: 'authb' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(user);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('protectedProcedure succeeds with a valid JWT', async () => {
    const me = await apiClient(server.url, user.accessToken).athlete.getMyAthlete.query();
    expect(me.athleteId).toBe(user.athleteId);
  });

  it('protectedProcedure returns UNAUTHORIZED with an invalidated JWT', async () => {
    // A literally-expired JWT cannot be minted without the project's signing
    // secret; deleting the auth user invalidates the token at GoTrue and
    // exercises the identical rejection path (see invalidateAuthUser).
    const doomed = await createAuthedUser({ withAthlete: false, label: 'doomed' });
    try {
      await invalidateAuthUser(doomed);
      await expectTRPCCode(
        apiClient(server.url, doomed.accessToken).athlete.getMyAthlete.query(),
        'UNAUTHORIZED',
      );
    } finally {
      await cleanupAuthedUser(doomed);
    }
  });
  it('trainerProcedure returns FORBIDDEN for a signed-in user who trains no club', async () => {
    // Replaces the removed SYSTEM-only verifyAchievement gate: verification is
    // now decided by club trainers only (add-achievement-certification).
    const clubId = await createTestClub('auth-boundary');
    try {
      await expectTRPCCode(
        apiClient(server.url, user.accessToken).achievement.decideCertification.mutate({
          clubId,
          requestId: 'cunknownid000000000000000',
          decision: 'APPROVE',
        }),
        'FORBIDDEN',
      );
    } finally {
      await cleanupTestClub(clubId);
    }
  });
});
