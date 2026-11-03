/**
 * Trainer access after revocation and club deactivation (ADR-017;
 * trainer-access-boundary and membership-notifications specs).
 *
 * Every trainer procedure — inviteAthlete, listRoster, reportEntry,
 * listPendingCertifications, decideCertification — is called over HTTP as
 *   - a revoked trainer of club R, and
 *   - a non-revoked trainer of deactivated club D,
 * and each call is FORBIDDEN with nothing written. A revoked trainer also
 * gets no certification-request notification, while a non-revoked trainer of
 * the same club does.
 *
 * Revocation and deactivation are set directly on the rows here; the admin
 * services that set them are covered by their own tests.
 */
import './helpers/load-env.js';

import type { QueueJobData, QueueName } from '@packages/queue';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';

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

interface Enqueued {
  queue: QueueName;
  data: QueueJobData[QueueName];
}

describe.skipIf(!authReady)('trainer access after revocation and deactivation', () => {
  const enqueued: Enqueued[] = [];
  const recorder: JobEnqueuer = {
    enqueue(queue, data) {
      enqueued.push({ queue, data });
      return Promise.resolve();
    },
  };

  let server: TestServer;
  let sportId: string;
  let definitionId: string;
  let clubR: string; // has a revoked trainer and a non-revoked one
  let clubD: string; // deactivated
  let revokedTrainer: AuthedUser;
  let activeTrainerR: AuthedUser;
  let trainerD: AuthedUser;
  let athlete: AuthedUser;
  let invitee: AuthedUser;
  let pendingAtR: string;
  let pendingAtD: string;

  const as = (user: AuthedUser) => apiClient(server.url, user.accessToken);

  function athleteIdOf(user: AuthedUser): string {
    if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
    return user.athleteId;
  }

  async function newAchievement(title: string): Promise<string> {
    const created = await as(athlete).achievement.addAchievement.mutate({
      title,
      organization: 'Federación Colombiana de Ciclismo',
      achievedOn: '2025-09-14',
    });
    return created.id;
  }

  beforeAll(async () => {
    server = await startServer(
      { public: 100_000, authenticated: 100_000, sensitive: 100_000 },
      { jobs: recorder },
    );
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    [revokedTrainer, activeTrainerR, trainerD, athlete, invitee] = await Promise.all([
      createAuthedUser({ withAthlete: false, label: 'tal-rev' }),
      createAuthedUser({ withAthlete: false, label: 'tal-act' }),
      createAuthedUser({ withAthlete: false, label: 'tal-d' }),
      createAuthedUser({ sportId, label: 'tal-ath' }),
      createAuthedUser({ sportId, label: 'tal-inv' }),
    ]);
    clubR = await createTestClub('tal-r');
    clubD = await createTestClub('tal-d');
    const revokedRow = await addClubTrainer(clubR, revokedTrainer.userAccountId);
    await addClubTrainer(clubR, activeTrainerR.userAccountId);
    const rowD = await addClubTrainer(clubD, trainerD.userAccountId);
    await createTestMembership({
      clubId: clubR, athleteId: athleteIdOf(athlete), clubTrainerId: revokedRow, status: 'ACTIVE',
    });
    await createTestMembership({
      clubId: clubD, athleteId: athleteIdOf(athlete), clubTrainerId: rowD, status: 'ACTIVE',
    });

    // Club D's request is made while D is active, then D is deactivated
    // directly (no cascade), so a PENDING request remains to decide.
    pendingAtD = (
      await as(athlete).achievement.requestCertification.mutate({
        achievementId: await newAchievement('Oro Clásico RCN'),
        clubId: clubD,
      })
    ).id;
    await prisma.club.update({
      where: { id: clubD },
      data: { deactivatedAt: new Date() },
      select: { id: true },
    });
    await prisma.clubTrainer.update({
      where: { id: revokedRow },
      data: { revokedAt: new Date() },
      select: { id: true },
    });

    enqueued.length = 0;
    pendingAtR = (
      await as(athlete).achievement.requestCertification.mutate({
        achievementId: await newAchievement('Plata Vuelta a Colombia'),
        clubId: clubR,
      })
    ).id;
  });

  afterAll(async () => {
    await cleanupTestClub(clubR);
    await cleanupTestClub(clubD);
    await deleteTestMetricDefinition(definitionId);
    for (const user of [revokedTrainer, activeTrainerR, trainerD, athlete, invitee]) {
      await cleanupAuthedUser(user);
    }
    await deleteTestSport(sportId);
    await server.close();
  });

  it('notifies only the non-revoked trainer of a new certification request', () => {
    const recipients = enqueued
      .filter((e) => e.queue === 'notifications')
      .map((e) => (e.data as QueueJobData['notifications']).userAccountId);
    expect(recipients).toContain(activeTrainerR.userAccountId);
    expect(recipients).not.toContain(revokedTrainer.userAccountId);
  });

  const cases = [
    { name: 'a revoked trainer', trainer: () => revokedTrainer, club: () => clubR, request: () => pendingAtR },
    { name: 'a trainer of a deactivated club', trainer: () => trainerD, club: () => clubD, request: () => pendingAtD },
  ];

  describe.each(cases)('$name', ({ trainer, club, request }) => {
    it('gets FORBIDDEN from club.inviteAthlete and creates no membership', async () => {
      await expectTRPCCode(
        as(trainer()).club.inviteAthlete.mutate({ clubId: club(), athleteId: athleteIdOf(invitee) }),
        'FORBIDDEN',
      );
      expect(
        await prisma.clubMembership.count({
          where: { clubId: club(), athleteId: athleteIdOf(invitee) },
        }),
      ).toBe(0);
    });

    it('gets FORBIDDEN from club.listRoster', async () => {
      await expectTRPCCode(as(trainer()).club.listRoster.query({ clubId: club() }), 'FORBIDDEN');
    });

    it('gets FORBIDDEN from metric.reportEntry and stores no entry', async () => {
      await expectTRPCCode(
        as(trainer()).metric.reportEntry.mutate({
          clubId: club(),
          athleteId: athleteIdOf(athlete),
          metricDefinitionId: definitionId,
          value: 48.5,
          measuredAt: new Date('2026-10-20T14:00:00Z'),
        }),
        'FORBIDDEN',
      );
      expect(
        await prisma.athleteMetricEntry.count({
          where: { athleteId: athleteIdOf(athlete), metricDefinitionId: definitionId },
        }),
      ).toBe(0);
    });

    it('gets FORBIDDEN from achievement.listPendingCertifications', async () => {
      await expectTRPCCode(
        as(trainer()).achievement.listPendingCertifications.query({ clubId: club() }),
        'FORBIDDEN',
      );
    });

    it('gets FORBIDDEN from achievement.decideCertification and the request stays PENDING', async () => {
      await expectTRPCCode(
        as(trainer()).achievement.decideCertification.mutate({
          clubId: club(),
          requestId: request(),
          decision: 'APPROVE',
        }),
        'FORBIDDEN',
      );
      const { status } = await prisma.achievementCertificationRequest.findUniqueOrThrow({
        where: { id: request() },
        select: { status: true },
      });
      expect(status).toBe('PENDING');
    });
  });

  it('still lets the non-revoked trainer of club R use trainer procedures', async () => {
    const roster = await as(activeTrainerR).club.listRoster.query({ clubId: clubR });
    expect(roster.items.length).toBeGreaterThan(0);
  });
});
