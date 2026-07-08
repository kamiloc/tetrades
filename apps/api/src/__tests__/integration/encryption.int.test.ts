/**
 * Encryption round-trip (task 3.9) — L2 fields written through the API are
 * encrypted at rest (raw Bytes in the DB, no plaintext) and decrypt back to
 * the exact plaintext through the API. Public surfaces never expose _Enc
 * fields.
 */
import './helpers/load-env.js';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupFixtureAthlete,
  createAuthedUser,
  createFixtureAthlete,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
  startServer,
  type AuthedUser,
  type FixtureAthlete,
  type TestServer,
} from './helpers/setup.js';

const PLAINTEXT = {
  exactDob: '1996-08-14',
  contactEmail: 'mariana.pajon.test@test.internal',
  contactPhone: '+57 310 555 1234',
  govId: 'CC-1029384756',
};

describe.skipIf(!authReady)('encryption round-trip through the API', () => {
  let server: TestServer;
  let sportId: string;
  let user: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    user = await createAuthedUser({ sportId, label: 'crypto' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(user);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('stores via updateProfile and retrieves the intact plaintext via getProfile', async () => {
    if (user.athleteId === null) throw new Error('fixture invariant');
    const client = apiClient(server.url, user.accessToken);

    const updated = await client.athlete.updateProfile.mutate(PLAINTEXT);
    expect(updated.contactEmail).toBe(PLAINTEXT.contactEmail);

    const profile = await client.athlete.getProfile.query({ athleteId: user.athleteId });
    expect({
      exactDob: profile.exactDob,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      govId: profile.govId,
    }).toEqual(PLAINTEXT);
  });

  it('persists raw Bytes — the database row never contains the plaintext', async () => {
    if (user.athleteId === null) throw new Error('fixture invariant');
    await apiClient(server.url, user.accessToken).athlete.updateProfile.mutate(PLAINTEXT);

    // Success criterion 5: query the raw column directly.
    const row = await prisma.athletePrivateProfile.findUniqueOrThrow({
      where: { athleteId: user.athleteId },
      select: {
        exactDobEnc: true,
        contactEmailEnc: true,
        contactPhoneEnc: true,
        govIdEnc: true,
      },
    });

    const cases: Array<[Uint8Array | null, string]> = [
      [row.exactDobEnc, PLAINTEXT.exactDob],
      [row.contactEmailEnc, PLAINTEXT.contactEmail],
      [row.contactPhoneEnc, PLAINTEXT.contactPhone],
      [row.govIdEnc, PLAINTEXT.govId],
    ];
    for (const [stored, plaintext] of cases) {
      expect(stored).toBeInstanceOf(Uint8Array);
      if (stored === null) throw new Error('unreachable: asserted above');
      expect(stored.byteLength).toBeGreaterThan(0);
      // AES-256-GCM envelope: the decoded buffer must not leak the value.
      expect(Buffer.from(stored).toString('utf8')).not.toContain(plaintext);
    }
  });
});

describe.skipIf(!dbReady)('public profile encryption surface', () => {
  let server: TestServer;
  let sportId: string;
  let fixture: FixtureAthlete;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    fixture = await createFixtureAthlete(sportId);
  });

  afterAll(async () => {
    await cleanupFixtureAthlete(fixture);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('getPublicProfile never returns an _Enc field', async () => {
    const profile = await apiClient(server.url).athlete.getPublicProfile.query({
      slug: fixture.slug,
    });

    expect(profile.athleteId).toBe(fixture.athleteId);
    const encKeys = Object.keys(profile).filter((key) => /enc$/i.test(key));
    expect(encKeys).toEqual([]);
  });
});
