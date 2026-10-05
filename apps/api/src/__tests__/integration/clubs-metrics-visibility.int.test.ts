/**
 * club / metric / visibility routers (tasks 5.2–5.4) over real HTTP with
 * real Supabase JWTs. Per AGENTS.md every procedure gets success,
 * invalid-input, 401 (protected), and 404 coverage; trainer procedures also
 * get FORBIDDEN for non-trainers and cross-club callers. The metric section
 * proves stranger-lists-private-athlete and list/detail parity.
 */
import './helpers/load-env.js';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupTestClub,
  createAuthedUser,
  createTestClub,
  createTestMembership,
  createTestMetricDefinition,
  createTestSport,
  deleteTestMetricDefinition,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

const UNKNOWN_ID = 'cunknownid000000000000000';

function athleteIdOf(user: AuthedUser): string {
  if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
  return user.athleteId;
}

describe.skipIf(!authReady)('club, metric, and visibility routers', () => {
  let server: TestServer;
  let sportId: string;
  let definitionId: string;
  let clubA: string;
  let clubB: string;
  let trainerA: AuthedUser;
  let trainerB: AuthedUser;
  let athlete: AuthedUser;
  let stranger: AuthedUser;
  let trainerARow: string;

  const as = (user?: AuthedUser) => apiClient(server.url, user?.accessToken);

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000, sensitive: 100_000 });
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    [trainerA, trainerB, athlete, stranger] = await Promise.all([
      createAuthedUser({ sportId, label: 'cmv-ta' }),
      createAuthedUser({ sportId, label: 'cmv-tb' }),
      createAuthedUser({ sportId, label: 'cmv-ath' }),
      createAuthedUser({ sportId, label: 'cmv-str' }),
    ]);
    clubA = await createTestClub('cmv-a');
    clubB = await createTestClub('cmv-b');
    trainerARow = await addClubTrainer(clubA, trainerA.userAccountId);
    await addClubTrainer(clubB, trainerB.userAccountId);
  });

  afterAll(async () => {
    await cleanupTestClub(clubA);
    await cleanupTestClub(clubB);
    await deleteTestMetricDefinition(definitionId);
    for (const user of [trainerA, trainerB, athlete, stranger]) await cleanupAuthedUser(user);
    await deleteTestSport(sportId);
    await server.close();
  });

  // Entries and summaries reference memberships through Restrict FKs, so they go first.
  const resetMemberships = async () => {
    const where = { athleteId: athleteIdOf(athlete) };
    await prisma.athleteMetricEntry.deleteMany({ where });
    await prisma.athleteMetricSummary.deleteMany({ where });
    await prisma.clubMembership.deleteMany({ where });
  };

  // ── club ──────────────────────────────────────────────────────────────────

  describe('club.inviteAthlete', () => {
    it('creates a pending invitation for a trainer of the club', async () => {
      await resetMemberships();
      const result = await as(trainerA).club.inviteAthlete.mutate({
        clubId: clubA,
        athleteId: athleteIdOf(athlete),
      });
      expect(result.status).toBe('PENDING_ATHLETE_CONFIRMATION');
    });

    it('rejects invalid input', async () => {
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: 'not-a-cuid', athleteId: athleteIdOf(athlete) }),
        'BAD_REQUEST',
      );
    });

    it('is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(
        as().club.inviteAthlete.mutate({ clubId: clubA, athleteId: athleteIdOf(athlete) }),
        'UNAUTHORIZED',
      );
    });

    it('is NOT_FOUND for an unknown club or athlete', async () => {
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: UNKNOWN_ID, athleteId: athleteIdOf(athlete) }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: clubA, athleteId: UNKNOWN_ID }),
        'NOT_FOUND',
      );
    });

    it('is FORBIDDEN for a non-trainer and for another club', async () => {
      await expectTRPCCode(
        as(stranger).club.inviteAthlete.mutate({ clubId: clubA, athleteId: athleteIdOf(athlete) }),
        'FORBIDDEN',
      );
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: clubB, athleteId: athleteIdOf(athlete) }),
        'FORBIDDEN',
      );
    });

    it('is CONFLICT for a duplicate open membership', async () => {
      await resetMemberships();
      await as(trainerA).club.inviteAthlete.mutate({ clubId: clubA, athleteId: athleteIdOf(athlete) });
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: clubA, athleteId: athleteIdOf(athlete) }),
        'CONFLICT',
      );
    });
  });

  describe('club.respondToInvitation and club.leave', () => {
    it('lets the athlete accept and then leave', async () => {
      await resetMemberships();
      const { id } = await as(trainerA).club.inviteAthlete.mutate({
        clubId: clubA,
        athleteId: athleteIdOf(athlete),
      });
      expect(
        await as(athlete).club.respondToInvitation.mutate({ membershipId: id, status: 'ACTIVE' }),
      ).toEqual({ id, status: 'ACTIVE' });
      expect(await as(athlete).club.leave.mutate({ membershipId: id })).toEqual({
        id,
        status: 'COMPLETED',
      });
    });

    it('is FORBIDDEN for the trainer and for another athlete', async () => {
      await resetMemberships();
      const { id } = await as(trainerA).club.inviteAthlete.mutate({
        clubId: clubA,
        athleteId: athleteIdOf(athlete),
      });
      await expectTRPCCode(
        as(trainerA).club.respondToInvitation.mutate({ membershipId: id, status: 'ACTIVE' }),
        'FORBIDDEN',
      );
      await expectTRPCCode(
        as(stranger).club.respondToInvitation.mutate({ membershipId: id, status: 'REJECTED' }),
        'FORBIDDEN',
      );
    });

    it('rejects invalid input, including a non-respond status', async () => {
      await expectTRPCCode(
        as(athlete).club.respondToInvitation.mutate({
          membershipId: UNKNOWN_ID,
          // Not a valid response; the cast only gets it past the compiler so Zod rejects it at runtime.
          status: 'COMPLETED' as 'ACTIVE',
        }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(as(athlete).club.leave.mutate({ membershipId: 'x' }), 'BAD_REQUEST');
    });

    it('is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(
        as().club.respondToInvitation.mutate({ membershipId: UNKNOWN_ID, status: 'ACTIVE' }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(as().club.leave.mutate({ membershipId: UNKNOWN_ID }), 'UNAUTHORIZED');
    });

    it('is NOT_FOUND for an unknown membership', async () => {
      await expectTRPCCode(
        as(athlete).club.respondToInvitation.mutate({ membershipId: UNKNOWN_ID, status: 'ACTIVE' }),
        'NOT_FOUND',
      );
      await expectTRPCCode(as(athlete).club.leave.mutate({ membershipId: UNKNOWN_ID }), 'NOT_FOUND');
    });
  });

  describe('club.listMyMemberships', () => {
    it('returns own memberships with club details, paginated', async () => {
      await resetMemberships();
      await as(trainerA).club.inviteAthlete.mutate({ clubId: clubA, athleteId: athleteIdOf(athlete) });
      const page = await as(athlete).club.listMyMemberships.query({ take: 20 });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.club.id).toBe(clubA);
      expect(page.nextCursor).toBeNull();
      expect(await as(stranger).club.listMyMemberships.query({})).toEqual({ items: [], nextCursor: null });
    });

    it('rejects invalid input and is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(as(athlete).club.listMyMemberships.query({ take: 51 }), 'BAD_REQUEST');
      await expectTRPCCode(as().club.listMyMemberships.query({}), 'UNAUTHORIZED');
    });

    it('is NOT_FOUND for a caller without an athlete profile', async () => {
      const noAthlete = await createAuthedUser({ withAthlete: false, label: 'cmv-noath' });
      try {
        await expectTRPCCode(as(noAthlete).club.listMyMemberships.query({}), 'NOT_FOUND');
      } finally {
        await cleanupAuthedUser(noAthlete);
      }
    });
  });

  describe('club.listRoster', () => {
    it('returns ACTIVE members and own pending invitations, with L0 identity only', async () => {
      await resetMemberships();
      const otherTrainer = await createAuthedUser({ sportId, label: 'cmv-ta2' });
      const otherRow = await addClubTrainer(clubA, otherTrainer.userAccountId);
      const pendingByOther = await createAuthedUser({ sportId, label: 'cmv-pend' });
      const completedAthlete = await createAuthedUser({ sportId, label: 'cmv-comp' });
      try {
        const active = await createTestMembership({
          clubId: clubA, athleteId: athleteIdOf(athlete), clubTrainerId: trainerARow, status: 'ACTIVE',
        });
        const hidden = await createTestMembership({
          clubId: clubA, athleteId: athleteIdOf(pendingByOther), clubTrainerId: otherRow,
          status: 'PENDING_ATHLETE_CONFIRMATION',
        });
        const ended = await createTestMembership({
          clubId: clubA, athleteId: athleteIdOf(completedAthlete), clubTrainerId: trainerARow,
          status: 'COMPLETED',
        });
        const ownPending = await createTestMembership({
          clubId: clubA, athleteId: athleteIdOf(stranger), clubTrainerId: trainerARow,
          status: 'PENDING_ATHLETE_CONFIRMATION',
        });

        const page = await as(trainerA).club.listRoster.query({ clubId: clubA });
        const ids = page.items.map((r) => r.id).sort();
        expect(ids).toEqual([active, ownPending].sort());
        expect(ids).not.toContain(hidden);
        expect(ids).not.toContain(ended);
        for (const row of page.items) {
          expect(Object.keys(row.athlete).sort()).toEqual(['displayName', 'id', 'slug']);
        }
      } finally {
        await prisma.clubMembership.deleteMany({
          where: { athleteId: { in: [athleteIdOf(pendingByOther), athleteIdOf(completedAthlete), athleteIdOf(stranger)] } },
        });
        for (const u of [otherTrainer, pendingByOther, completedAthlete]) await cleanupAuthedUser(u);
      }
    });

    it('is FORBIDDEN for a non-trainer and for another club', async () => {
      await expectTRPCCode(as(athlete).club.listRoster.query({ clubId: clubA }), 'FORBIDDEN');
      await expectTRPCCode(as(trainerB).club.listRoster.query({ clubId: clubA }), 'FORBIDDEN');
    });

    it('rejects invalid input, is UNAUTHORIZED without a token, NOT_FOUND for an unknown club', async () => {
      await expectTRPCCode(as(trainerA).club.listRoster.query({ clubId: 'nope' }), 'BAD_REQUEST');
      await expectTRPCCode(as().club.listRoster.query({ clubId: clubA }), 'UNAUTHORIZED');
      await expectTRPCCode(as(trainerA).club.listRoster.query({ clubId: UNKNOWN_ID }), 'NOT_FOUND');
    });
  });

  // ── metric ────────────────────────────────────────────────────────────────

  describe('metric.listDefinitions', () => {
    it('is public, paginated, and active-only', async () => {
      const inactive = await createTestMetricDefinition();
      await prisma.metricDefinition.update({ where: { id: inactive }, data: { isActive: false }, select: { id: true } });
      try {
        const ids: string[] = [];
        let cursor: string | undefined;
        do {
          const page = await as().metric.listDefinitions.query({ take: 50, cursor });
          ids.push(...page.items.map((d) => d.id));
          cursor = page.nextCursor ?? undefined;
        } while (cursor !== undefined);
        expect(ids).toContain(definitionId);
        expect(ids).not.toContain(inactive);
      } finally {
        await deleteTestMetricDefinition(inactive);
      }
    });

    it('rejects invalid input', async () => {
      await expectTRPCCode(as().metric.listDefinitions.query({ take: 0 }), 'BAD_REQUEST');
    });
  });

  describe('metric.reportEntry', () => {
    const input = (clubId: string, athleteId: string) => ({
      clubId,
      athleteId,
      metricDefinitionId: definitionId,
      value: 52.3,
      measuredAt: new Date(),
    });

    it('stores an entry for an ACTIVE member', async () => {
      await resetMemberships();
      await createTestMembership({
        clubId: clubA, athleteId: athleteIdOf(athlete), clubTrainerId: trainerARow, status: 'ACTIVE',
      });
      const entry = await as(trainerA).metric.reportEntry.mutate(input(clubA, athleteIdOf(athlete)));
      expect(entry.value).toBe(52.3);
      expect(entry.clubId).toBe(clubA);
    });

    it('is FORBIDDEN for a pending member, a non-trainer, and another club', async () => {
      await resetMemberships();
      await createTestMembership({
        clubId: clubA, athleteId: athleteIdOf(athlete), clubTrainerId: trainerARow,
        status: 'PENDING_ATHLETE_CONFIRMATION',
      });
      await expectTRPCCode(as(trainerA).metric.reportEntry.mutate(input(clubA, athleteIdOf(athlete))), 'FORBIDDEN');
      await expectTRPCCode(as(stranger).metric.reportEntry.mutate(input(clubA, athleteIdOf(athlete))), 'FORBIDDEN');
      await expectTRPCCode(as(trainerB).metric.reportEntry.mutate(input(clubA, athleteIdOf(athlete))), 'FORBIDDEN');
    });

    it('rejects invalid input, is UNAUTHORIZED without a token, NOT_FOUND for unknown club or metric', async () => {
      await expectTRPCCode(
        as(trainerA).metric.reportEntry.mutate({ ...input(clubA, athleteIdOf(athlete)), value: Number.NaN }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(as().metric.reportEntry.mutate(input(clubA, athleteIdOf(athlete))), 'UNAUTHORIZED');
      await expectTRPCCode(
        as(trainerA).metric.reportEntry.mutate(input(UNKNOWN_ID, athleteIdOf(athlete))),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(trainerA).metric.reportEntry.mutate({ ...input(clubA, athleteIdOf(athlete)), metricDefinitionId: UNKNOWN_ID }),
        'NOT_FOUND',
      );
    });
  });

  describe('metric reads: visibility, list/detail parity', () => {
    beforeAll(async () => {
      await resetMemberships();
      await createTestMembership({
        clubId: clubA, athleteId: athleteIdOf(athlete), clubTrainerId: trainerARow, status: 'ACTIVE',
      });
      await as(trainerA).metric.reportEntry.mutate({
        clubId: clubA, athleteId: athleteIdOf(athlete), metricDefinitionId: definitionId,
        value: 61, measuredAt: new Date(),
      });
    });

    const read = async (user?: AuthedUser) => {
      const client = as(user);
      const [list, summaries] = await Promise.all([
        client.metric.listEntries.query({ athleteId: athleteIdOf(athlete) }),
        client.metric.getSummaries.query({ athleteId: athleteIdOf(athlete) }),
      ]);
      return { entries: list.items.length, summaries: summaries.length };
    };

    it('hides a PRIVATE athlete from strangers and anonymous callers in list and detail', async () => {
      await as(athlete).visibility.update.mutate({ metricsAudience: 'PRIVATE' });
      expect(await read(stranger)).toEqual({ entries: 0, summaries: 0 });
      expect(await read()).toEqual({ entries: 0, summaries: 0 });
    });

    it('list and detail agree for every audience and caller', async () => {
      for (const audience of ['PRIVATE', 'CONNECTIONS', 'PUBLIC'] as const) {
        await as(athlete).visibility.update.mutate({ metricsAudience: audience });
        for (const caller of [athlete, stranger, undefined]) {
          const { entries, summaries } = await read(caller);
          expect(entries > 0, `${audience} / ${caller?.email ?? 'anon'}`).toBe(summaries > 0);
        }
      }
    });

    it('owner always sees own data; ACTIVE-club trainer sees club entries regardless', async () => {
      await as(athlete).visibility.update.mutate({ metricsAudience: 'PRIVATE' });
      expect((await read(athlete)).entries).toBeGreaterThan(0);
      expect((await read(trainerA)).entries).toBeGreaterThan(0);
      expect((await read(trainerB)).entries).toBe(0);
    });

    it('rejects invalid input and is NOT_FOUND for an unknown athlete', async () => {
      await expectTRPCCode(as().metric.listEntries.query({ athleteId: 'nope' }), 'BAD_REQUEST');
      await expectTRPCCode(as().metric.getSummaries.query({ athleteId: 'nope' }), 'BAD_REQUEST');
      await expectTRPCCode(as().metric.listEntries.query({ athleteId: UNKNOWN_ID }), 'NOT_FOUND');
      await expectTRPCCode(as().metric.getSummaries.query({ athleteId: UNKNOWN_ID }), 'NOT_FOUND');
    });
  });

  // ── visibility ────────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('returns PRIVATE defaults when no row exists, then the stored settings', async () => {
      await prisma.athleteVisibilitySettings.deleteMany({ where: { athleteId: athleteIdOf(stranger) } });
      expect(await as(stranger).visibility.get.query()).toEqual({
        clubMembershipsAudience: 'PRIVATE',
        metricsAudience: 'PRIVATE',
        updatedAt: null,
      });
      const updated = await as(stranger).visibility.update.mutate({ metricsAudience: 'CONNECTIONS' });
      expect(updated.metricsAudience).toBe('CONNECTIONS');
      expect(updated.clubMembershipsAudience).toBe('PRIVATE');
      expect((await as(stranger).visibility.get.query()).metricsAudience).toBe('CONNECTIONS');
    });

    it("never touches another athlete's settings (owner-only by construction)", async () => {
      await as(athlete).visibility.update.mutate({ metricsAudience: 'PUBLIC' });
      // athleteId is not part of the input; a non-literal object skips the
      // excess-property check so the injected id actually reaches the server.
      const injected = { metricsAudience: 'PRIVATE' as const, athleteId: athleteIdOf(athlete) };
      await as(stranger).visibility.update.mutate(injected);
      expect((await as(athlete).visibility.get.query()).metricsAudience).toBe('PUBLIC');
      // A trainer of the athlete's ACTIVE club reads only their own settings.
      expect((await as(trainerA).visibility.get.query()).metricsAudience).not.toBe('PUBLIC');
    });

    it('rejects invalid input', async () => {
      await expectTRPCCode(as(athlete).visibility.update.mutate({}), 'BAD_REQUEST');
      await expectTRPCCode(
        // Unknown audience; the cast only gets it past the compiler.
        as(athlete).visibility.update.mutate({ metricsAudience: 'FRIENDS' as 'PUBLIC' }),
        'BAD_REQUEST',
      );
    });

    it('is UNAUTHORIZED without a token', async () => {
      await expectTRPCCode(as().visibility.get.query(), 'UNAUTHORIZED');
      await expectTRPCCode(as().visibility.update.mutate({ metricsAudience: 'PUBLIC' }), 'UNAUTHORIZED');
    });

    it('is NOT_FOUND for a caller without an athlete profile', async () => {
      const noAthlete = await createAuthedUser({ withAthlete: false, label: 'cmv-noath2' });
      try {
        await expectTRPCCode(as(noAthlete).visibility.get.query(), 'NOT_FOUND');
      } finally {
        await cleanupAuthedUser(noAthlete);
      }
    });
  });
});
