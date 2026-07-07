/**
 * getMyAthlete (task 3.9, Sprint 3 backfill) — resolves the caller's own
 * athlete from the verified JWT, never from client input.
 */
import './helpers/load-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  createAuthedUser,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

describe.skipIf(!authReady)('getMyAthlete', () => {
  let server: TestServer;
  let sportId: string;
  let withAthlete: AuthedUser;
  let withoutAthlete: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    withAthlete = await createAuthedUser({ sportId, label: 'myath' });
    withoutAthlete = await createAuthedUser({ withAthlete: false, label: 'noath' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(withAthlete);
    await cleanupAuthedUser(withoutAthlete);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('returns the correct athleteId for the authenticated user', async () => {
    const me = await apiClient(server.url, withAthlete.accessToken)
      .athlete.getMyAthlete.query();

    expect(me.athleteId).toBe(withAthlete.athleteId);
    expect(me.displayName).toContain('Int myath');
    expect(me.sport).toContain('Int Test Sport');
  });

  it('returns NOT_FOUND when no Athlete record exists for the user', async () => {
    await expectTRPCCode(
      apiClient(server.url, withoutAthlete.accessToken).athlete.getMyAthlete.query(),
      'NOT_FOUND',
    );
  });
});
