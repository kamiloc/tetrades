/**
 * Ownership enforcement (task 3.9) — cross-tenant access must be rejected.
 *
 * Two enforcement styles exist in the API and both are covered:
 *   - Input-addressed procedures (getProfile, acceptRequest, rejectRequest)
 *     take an id and must return FORBIDDEN for non-owners.
 *   - Context-addressed procedures (updateProfile, addAchievement) take NO
 *     athleteId input at all — ownership is structural (ctx.userId → own
 *     athlete). A FORBIDDEN response is unreachable by design, so the tests
 *     prove the stronger property: an injected athleteId is ignored and only
 *     the caller's own rows are ever touched.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { CreateAchievementInput } from '@packages/validators';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupFixtureAthlete,
  createAuthedUser,
  createFixtureAthlete,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type FixtureAthlete,
  type TestServer,
} from './helpers/setup.js';

describe.skipIf(!authReady)('ownership enforcement', () => {
  let server: TestServer;
  let sportId: string;
  let owner: AuthedUser;
  let attacker: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    owner = await createAuthedUser({ sportId, label: 'owner' });
    attacker = await createAuthedUser({ sportId, label: 'attacker' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(owner);
    await cleanupAuthedUser(attacker);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('getProfile returns FORBIDDEN for an athleteId the caller does not own', async () => {
    if (owner.athleteId === null) throw new Error('fixture invariant');
    await expectTRPCCode(
      apiClient(server.url, attacker.accessToken).athlete.getProfile.query({
        athleteId: owner.athleteId,
      }),
      'FORBIDDEN',
    );
  });

  it('updateProfile can never write another athlete’s row (no athleteId input exists)', async () => {
    if (owner.athleteId === null || attacker.athleteId === null) {
      throw new Error('fixture invariant');
    }
    const ownerRowBefore = await prisma.athletePrivateProfile.findUniqueOrThrow({
      where: { athleteId: owner.athleteId },
      select: { contactEmailEnc: true, updatedAt: true },
    });

    // Inject an athleteId anyway — Zod strips unknown keys, so the write
    // must land on the attacker's own row.
    const injected = {
      contactEmail: 'attacker@evil.test',
      athleteId: owner.athleteId,
    } as { contactEmail: string };
    const result = await apiClient(server.url, attacker.accessToken)
      .athlete.updateProfile.mutate(injected);

    expect(result.athleteId).toBe(attacker.athleteId);
    expect(result.contactEmail).toBe('attacker@evil.test');

    const ownerRowAfter = await prisma.athletePrivateProfile.findUniqueOrThrow({
      where: { athleteId: owner.athleteId },
      select: { contactEmailEnc: true, updatedAt: true },
    });
    expect(ownerRowAfter.contactEmailEnc).toEqual(ownerRowBefore.contactEmailEnc);
    expect(ownerRowAfter.updatedAt.getTime()).toBe(ownerRowBefore.updatedAt.getTime());
  });

  it('addAchievement ignores an injected athleteId and creates under the caller', async () => {
    if (owner.athleteId === null || attacker.athleteId === null) {
      throw new Error('fixture invariant');
    }
    const title = `Injection Attempt ${randomUUID().slice(0, 8)}`;
    const injected = {
      title,
      organization: 'Federación Colombiana de Atletismo',
      achievedOn: '2025-11-02',
      athleteId: owner.athleteId,
    } as CreateAchievementInput;

    const created = await apiClient(server.url, attacker.accessToken)
      .achievement.addAchievement.mutate(injected);

    expect(created.athleteId).toBe(attacker.athleteId);
    const onOwner = await prisma.athleteAchievement.count({
      where: { athleteId: owner.athleteId, title },
    });
    expect(onOwner).toBe(0);
  });

  describe('connection responses by a non-addressee', () => {
    let requester: FixtureAthlete;
    let addressee: FixtureAthlete;

    beforeAll(async () => {
      requester = await createFixtureAthlete(sportId);
      addressee = await createFixtureAthlete(sportId);
    });

    afterAll(async () => {
      await cleanupFixtureAthlete(requester);
      await cleanupFixtureAthlete(addressee);
    });

    async function seedPendingConnection(): Promise<string> {
      const connection = await prisma.athleteConnection.create({
        data: {
          requesterId: requester.athleteId,
          addresseeId: addressee.athleteId,
          status: 'PENDING',
        },
        select: { id: true },
      });
      return connection.id;
    }

    it('acceptRequest returns FORBIDDEN when the caller is not the receiver', async () => {
      const connectionId = await seedPendingConnection();
      try {
        await expectTRPCCode(
          apiClient(server.url, attacker.accessToken).connection.acceptRequest.mutate({
            connectionId,
          }),
          'FORBIDDEN',
        );
        const untouched = await prisma.athleteConnection.findUniqueOrThrow({
          where: { id: connectionId },
          select: { status: true },
        });
        expect(untouched.status).toBe('PENDING');
      } finally {
        await prisma.athleteConnection.deleteMany({ where: { id: connectionId } });
      }
    });

    it('rejectRequest returns FORBIDDEN when the caller is not the receiver', async () => {
      const connectionId = await seedPendingConnection();
      try {
        await expectTRPCCode(
          apiClient(server.url, attacker.accessToken).connection.rejectRequest.mutate({
            connectionId,
          }),
          'FORBIDDEN',
        );
        const untouched = await prisma.athleteConnection.findUniqueOrThrow({
          where: { id: connectionId },
          select: { status: true },
        });
        expect(untouched.status).toBe('PENDING');
      } finally {
        await prisma.athleteConnection.deleteMany({ where: { id: connectionId } });
      }
    });
  });
});
