/**
 * Procedure correctness (task 3.9) — search, achievements, connections
 * against the real server and database.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { CreateAchievementInput } from '@packages/validators';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupFixtureAthlete,
  cleanupFixtureAthletes,
  createAuthedUser,
  createFixtureAthlete,
  createTestClub,
  createTestMembership,
  createTestSport,
  cleanupTestClub,
  dbReady,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type FixtureAthlete,
  type TestServer,
} from './helpers/setup.js';

// ---------------------------------------------------------------------------
// Public procedures — run without Supabase credentials
// ---------------------------------------------------------------------------

describe.skipIf(!dbReady)('public procedure correctness', () => {
  let server: TestServer;
  let sportId: string;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
  });

  afterAll(async () => {
    await deleteTestSport(sportId);
    await server.close();
  });

  it('getPublicProfile returns NOT_FOUND for an unknown slug', async () => {
    await expectTRPCCode(
      apiClient(server.url).athlete.getPublicProfile.query({
        slug: `no-such-athlete-${randomUUID().slice(0, 8)}`,
      }),
      'NOT_FOUND',
    );
  });

  it('searchAthletes returns an empty array (not an error) with no matches', async () => {
    const results = await apiClient(server.url).athlete.searchAthletes.query({
      query: `zz-nomatch-${randomUUID()}`,
    });
    expect(results).toEqual([]);
  });

  it('searchAthletes paginates without repeating results across pages', async () => {
    const marker = `Pagin${randomUUID().slice(0, 8)}`;
    // 22 searchable athletes > page size (20) so page 2 is non-empty.
    // Seeded in parallel: sequential creates over the hosted pooler are too
    // slow for the test timeout.
    const SEED_COUNT = 22;
    const fixtures: FixtureAthlete[] = [];
    try {
      fixtures.push(
        ...(await Promise.all(
          Array.from({ length: SEED_COUNT }, (_, i) =>
            createFixtureAthlete(sportId, {
              displayName: `${marker} Atleta ${String(i).padStart(2, '0')}`,
              isSearchable: true,
            }),
          ),
        )),
      );

      const client = apiClient(server.url);
      const pageOne = await client.athlete.searchAthletes.query({ query: marker });
      expect(pageOne).toHaveLength(20);

      const lastOfPageOne = pageOne[pageOne.length - 1];
      if (lastOfPageOne === undefined) throw new Error('unreachable: page one is non-empty');
      const pageTwo = await client.athlete.searchAthletes.query({
        query: marker,
        cursor: lastOfPageOne.athleteId,
      });
      expect(pageTwo).toHaveLength(SEED_COUNT - 20);

      const pageOneIds = new Set(pageOne.map((profile) => profile.athleteId));
      const overlap = pageTwo.filter((profile) => pageOneIds.has(profile.athleteId));
      expect(overlap).toEqual([]);

      const allIds = new Set([...pageOne, ...pageTwo].map((profile) => profile.athleteId));
      expect(allIds.size).toBe(SEED_COUNT);
    } finally {
      await cleanupFixtureAthletes(fixtures);
    }
  });
});

// ---------------------------------------------------------------------------
// Achievements — verification status is server-controlled
// ---------------------------------------------------------------------------

describe.skipIf(!authReady)('achievement correctness', () => {
  let server: TestServer;
  let sportId: string;
  let owner: AuthedUser;
  let visitor: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    owner = await createAuthedUser({ sportId, label: 'achowner' });
    visitor = await createAuthedUser({ sportId, label: 'achvisitor' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(owner);
    await cleanupAuthedUser(visitor);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('addAchievement always creates PENDING, even when the input claims VERIFIED', async () => {
    if (owner.athleteId === null) throw new Error('fixture invariant');
    const title = `Campeonato Nacional ${randomUUID().slice(0, 8)}`;
    // Zod strips the unknown key — the server decides the status.
    const inputClaimingVerified = {
      title,
      organization: 'Comité Olímpico Colombiano',
      achievedOn: '2025-06-15',
      verificationStatus: 'VERIFIED',
    } as CreateAchievementInput;

    const created = await apiClient(server.url, owner.accessToken)
      .achievement.addAchievement.mutate(inputClaimingVerified);
    expect(created.verificationStatus).toBe('PENDING');

    const inDb = await prisma.athleteAchievement.findUniqueOrThrow({
      where: { id: created.id },
      select: { verificationStatus: true },
    });
    expect(inDb.verificationStatus).toBe('PENDING');
  });

  // athlete-visibility spec: achievements are filtered by the athlete's
  // achievements audience; non-owners only ever see VERIFIED rows.
  describe('listAchievements visibility', () => {
    let friend: AuthedUser;
    let trainer: AuthedUser;
    let clubId: string;
    let verifiedId: string;
    let pendingId: string;

    const UNKNOWN_ID = 'cunknownid000000000000000';
    const ownerAthleteId = (): string => {
      if (owner.athleteId === null) throw new Error('fixture invariant');
      return owner.athleteId;
    };
    const read = (user?: AuthedUser) =>
      apiClient(server.url, user?.accessToken).achievement.listAchievements.query({
        athleteId: ownerAthleteId(),
      });
    const idsSeenBy = async (user?: AuthedUser) => (await read(user)).map((a) => a.id);
    const setAudience = (achievementsAudience: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC') =>
      apiClient(server.url, owner.accessToken).visibility.update.mutate({ achievementsAudience });

    beforeAll(async () => {
      [friend, trainer] = await Promise.all([
        createAuthedUser({ sportId, label: 'achfriend' }),
        createAuthedUser({ sportId, label: 'achtrainer', withAthlete: false }),
      ]);
      if (friend.athleteId === null) throw new Error('fixture invariant');
      await prisma.athleteConnection.create({
        data: { requesterId: ownerAthleteId(), addresseeId: friend.athleteId, status: 'ACCEPTED' },
      });
      clubId = await createTestClub('achclub');
      const clubTrainerId = await addClubTrainer(clubId, trainer.userAccountId);
      await createTestMembership({
        clubId, athleteId: ownerAthleteId(), clubTrainerId, status: 'ACTIVE',
      });

      const verified = await prisma.athleteAchievement.create({
        data: {
          athleteId: ownerAthleteId(),
          title: 'Medalla de Oro Juegos Panamericanos',
          organization: 'Panam Sports',
          achievedOn: new Date('2023-10-25'),
          verificationStatus: 'VERIFIED',
          verificationSource: 'Acta oficial Panam Sports 2023',
        },
        select: { id: true },
      });
      const pending = await prisma.athleteAchievement.create({
        data: {
          athleteId: ownerAthleteId(),
          title: 'Récord departamental 100m',
          organization: 'Liga de Atletismo del Valle',
          achievedOn: new Date('2024-03-09'),
          verificationStatus: 'PENDING',
        },
        select: { id: true },
      });
      verifiedId = verified.id;
      pendingId = pending.id;
    });

    afterAll(async () => {
      await prisma.clubMembership.deleteMany({ where: { athleteId: ownerAthleteId() } });
      await cleanupTestClub(clubId);
      await cleanupAuthedUser(friend);
      await cleanupAuthedUser(trainer);
    });

    it('returns every status to the owner, even under PRIVATE', async () => {
      await setAudience('PRIVATE');
      const ids = await idsSeenBy(owner);
      expect(ids).toContain(verifiedId);
      expect(ids).toContain(pendingId);
    });

    it('PRIVATE hides achievements from connections, strangers, and anonymous callers', async () => {
      await setAudience('PRIVATE');
      expect(await read(friend)).toEqual([]);
      expect(await read(visitor)).toEqual([]);
      expect(await read()).toEqual([]);
    });

    it('CONNECTIONS admits an ACCEPTED connection only', async () => {
      await setAudience('CONNECTIONS');
      expect(await idsSeenBy(friend)).toEqual([verifiedId]);
      expect(await read(visitor)).toEqual([]);
      expect(await read()).toEqual([]);
    });

    it('PUBLIC admits everyone, including anonymous callers, but never PENDING rows', async () => {
      await setAudience('PUBLIC');
      for (const caller of [friend, visitor, undefined]) {
        expect(await idsSeenBy(caller)).toEqual([verifiedId]);
      }
    });

    it('a missing settings row defaults to PUBLIC', async () => {
      await prisma.athleteVisibilitySettings.deleteMany({ where: { athleteId: ownerAthleteId() } });
      expect(await idsSeenBy(visitor)).toEqual([verifiedId]);
      expect(await idsSeenBy()).toEqual([verifiedId]);
    });

    it('an ACTIVE-club trainer gets no extra access under PRIVATE', async () => {
      await setAudience('PRIVATE');
      expect(await read(trainer)).toEqual([]);
    });

    it('returns only public fields', async () => {
      await setAudience('PUBLIC');
      for (const caller of [owner, undefined]) {
        for (const achievement of await read(caller)) {
          expect(Object.keys(achievement).sort()).toEqual(
            ['achievedOn', 'id', 'organization', 'title', 'verificationStatus'],
          );
        }
      }
    });

    it('rejects invalid input and is NOT_FOUND for an unknown athlete', async () => {
      const anon = apiClient(server.url).achievement.listAchievements;
      await expectTRPCCode(anon.query({ athleteId: 'not-a-cuid' }), 'BAD_REQUEST');
      await expectTRPCCode(anon.query({ athleteId: UNKNOWN_ID }), 'NOT_FOUND');
    });
  });
});

// ---------------------------------------------------------------------------
// Connections — request lifecycle and connectionCountCache integrity
// ---------------------------------------------------------------------------

describe.skipIf(!authReady)('connection correctness', () => {
  let server: TestServer;
  let sportId: string;
  let sender: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    sender = await createAuthedUser({ sportId, label: 'connsender' });
  });

  afterAll(async () => {
    await cleanupAuthedUser(sender);
    await deleteTestSport(sportId);
    await server.close();
  });

  async function connectionCount(athleteId: string): Promise<number> {
    const profile = await prisma.athletePublicProfile.findUniqueOrThrow({
      where: { athleteId },
      select: { connectionCountCache: true },
    });
    return profile.connectionCountCache;
  }

  it('sendRequest returns CONFLICT when an active connection exists', async () => {
    if (sender.athleteId === null) throw new Error('fixture invariant');
    const target = await createFixtureAthlete(sportId);
    try {
      await prisma.athleteConnection.create({
        data: {
          requesterId: sender.athleteId,
          addresseeId: target.athleteId,
          status: 'ACCEPTED',
        },
        select: { id: true },
      });

      await expectTRPCCode(
        apiClient(server.url, sender.accessToken).connection.sendRequest.mutate({
          targetAthleteId: target.athleteId,
        }),
        'CONFLICT',
      );
    } finally {
      await cleanupFixtureAthlete(target);
    }
  });

  it('sendRequest creates a NEW record when a rejected connection exists', async () => {
    if (sender.athleteId === null) throw new Error('fixture invariant');
    const target = await createFixtureAthlete(sportId);
    try {
      const declined = await prisma.athleteConnection.create({
        data: {
          requesterId: sender.athleteId,
          addresseeId: target.athleteId,
          status: 'DECLINED',
          respondedAt: new Date(),
        },
        select: { id: true },
      });

      const created = await apiClient(server.url, sender.accessToken)
        .connection.sendRequest.mutate({ targetAthleteId: target.athleteId });

      // A fresh PENDING record — not the DECLINED one mutated back.
      expect(created.status).toBe('PENDING');
      expect(created.id).not.toBe(declined.id);

      const rows = await prisma.athleteConnection.findMany({
        where: { requesterId: sender.athleteId, addresseeId: target.athleteId },
        select: { id: true, status: true },
      });
      expect(rows).toEqual([{ id: created.id, status: 'PENDING' }]);
    } finally {
      await cleanupFixtureAthlete(target);
    }
  });

  it('acceptRequest increments connectionCountCache on both athletes atomically', async () => {
    const requester = await createFixtureAthlete(sportId);
    const addressee = await createAuthedUser({ sportId, label: 'connacceptor' });
    try {
      if (addressee.athleteId === null) throw new Error('fixture invariant');
      const seeded = await prisma.athleteConnection.create({
        data: {
          requesterId: requester.athleteId,
          addresseeId: addressee.athleteId,
          status: 'PENDING',
        },
        select: { id: true },
      });
      const before = {
        requester: await connectionCount(requester.athleteId),
        addressee: await connectionCount(addressee.athleteId),
      };

      const accepted = await apiClient(server.url, addressee.accessToken)
        .connection.acceptRequest.mutate({ connectionId: seeded.id });
      expect(accepted.status).toBe('ACCEPTED');
      expect(accepted.respondedAt).not.toBeNull();

      const connection = await prisma.athleteConnection.findUniqueOrThrow({
        where: { id: seeded.id },
        select: { status: true },
      });
      // Success criterion 6: both increments asserted in a single block.
      expect({
        status: connection.status,
        requesterCount: await connectionCount(requester.athleteId),
        addresseeCount: await connectionCount(addressee.athleteId),
      }).toEqual({
        status: 'ACCEPTED',
        requesterCount: before.requester + 1,
        addresseeCount: before.addressee + 1,
      });
    } finally {
      await cleanupAuthedUser(addressee);
      await cleanupFixtureAthlete(requester);
    }
  });

  it('acceptRequest rolls back completely when one increment cannot be applied', async () => {
    const requester = await createFixtureAthlete(sportId);
    const addressee = await createAuthedUser({ sportId, label: 'connrollback' });
    try {
      if (addressee.athleteId === null) throw new Error('fixture invariant');
      const seeded = await prisma.athleteConnection.create({
        data: {
          requesterId: requester.athleteId,
          addresseeId: addressee.athleteId,
          status: 'PENDING',
        },
        select: { id: true },
      });
      // Remove the addressee's public profile so its increment (the LAST
      // statement in the $transaction) must fail after the other two.
      await prisma.athletePublicProfile.delete({
        where: { athleteId: addressee.athleteId },
      });

      await expectTRPCCode(
        apiClient(server.url, addressee.accessToken).connection.acceptRequest.mutate({
          connectionId: seeded.id,
        }),
        'INTERNAL_SERVER_ERROR',
      );

      // Both-or-nothing: the status update and the requester increment must
      // have rolled back with the failed addressee increment.
      const connection = await prisma.athleteConnection.findUniqueOrThrow({
        where: { id: seeded.id },
        select: { status: true },
      });
      expect({
        status: connection.status,
        requesterCount: await connectionCount(requester.athleteId),
      }).toEqual({
        status: 'PENDING',
        requesterCount: 0,
      });
    } finally {
      await cleanupAuthedUser(addressee);
      await cleanupFixtureAthlete(requester);
    }
  });

  it('rejectRequest does not modify connectionCountCache on either side', async () => {
    const requester = await createFixtureAthlete(sportId);
    const addressee = await createAuthedUser({ sportId, label: 'connrejector' });
    try {
      if (addressee.athleteId === null) throw new Error('fixture invariant');
      const seeded = await prisma.athleteConnection.create({
        data: {
          requesterId: requester.athleteId,
          addresseeId: addressee.athleteId,
          status: 'PENDING',
        },
        select: { id: true },
      });
      const before = {
        requester: await connectionCount(requester.athleteId),
        addressee: await connectionCount(addressee.athleteId),
      };

      const rejected = await apiClient(server.url, addressee.accessToken)
        .connection.rejectRequest.mutate({ connectionId: seeded.id });
      expect(rejected.status).toBe('DECLINED');

      const connection = await prisma.athleteConnection.findUniqueOrThrow({
        where: { id: seeded.id },
        select: { status: true },
      });
      expect({
        status: connection.status,
        requesterCount: await connectionCount(requester.athleteId),
        addresseeCount: await connectionCount(addressee.athleteId),
      }).toEqual({
        status: 'DECLINED',
        requesterCount: before.requester,
        addresseeCount: before.addressee,
      });
    } finally {
      await cleanupAuthedUser(addressee);
      await cleanupFixtureAthlete(requester);
    }
  });
});
