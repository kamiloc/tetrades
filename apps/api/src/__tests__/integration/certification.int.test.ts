/**
 * Achievement certification procedures (achievement-certification and
 * membership-notifications specs) over real HTTP with real Supabase JWTs and
 * the real database. Per AGENTS.md every procedure gets success,
 * invalid-input, 401, and 404 coverage; trainer procedures also get
 * FORBIDDEN for non-trainers and cross-club callers.
 *
 * A recording job port proves notifications are enqueued with identifiers
 * only; a failing port proves a lost notification never fails the request or
 * the decision. After every flow the achievement's verificationStatus is
 * checked against its request history.
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
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type MembershipStatus,
  type TestServer,
} from './helpers/setup.js';

const UNKNOWN_ID = 'cunknownid000000000000000';
const L2_KEY = /^(exactDob|contactEmail|contactPhone|govId|governmentId)(Enc)?$/;

function athleteIdOf(user: AuthedUser): string {
  if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
  return user.athleteId;
}

/** Every key in a JSON-like value, recursively. */
function keysOf(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keysOf(v, out);
  else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

interface Enqueued {
  queue: QueueName;
  data: QueueJobData[QueueName];
}

describe.skipIf(!authReady)('achievement certification', () => {
  const enqueued: Enqueued[] = [];
  const recorder: JobEnqueuer = {
    enqueue(queue, data) {
      enqueued.push({ queue, data });
      return Promise.resolve();
    },
  };
  const failing: JobEnqueuer = { enqueue: () => Promise.reject(new Error('redis down')) };

  let server: TestServer;
  let failingServer: TestServer;
  let sportId: string;
  // Clubs: A and B where `athlete` is ACTIVE; one club per non-ACTIVE state;
  // E for the "membership ended before the decision" case.
  const clubs: Record<'A' | 'B' | 'E' | MembershipStatus | 'NONE', string> = {
    A: '',
    B: '',
    E: '',
    PENDING_ATHLETE_CONFIRMATION: '',
    ACTIVE: '',
    COMPLETED: '',
    REJECTED: '',
    NONE: '',
  };
  let trainerA: AuthedUser;
  let trainerA2: AuthedUser;
  let trainerB: AuthedUser;
  let athlete: AuthedUser;
  let other: AuthedUser;
  let noAthlete: AuthedUser;
  let trainerARow: string;
  let trainerBRow: string;
  let membershipE: string;

  const as = (user?: AuthedUser) => apiClient(server.url, user?.accessToken);

  /** Added through the API, so it starts UNVERIFIED like a real one. */
  async function newAchievement(owner: AuthedUser, title: string): Promise<string> {
    const created = await as(owner).achievement.addAchievement.mutate({
      title,
      organization: 'Liga Antioqueña de Fútbol',
      achievedOn: '2025-08-17',
    });
    return created.id;
  }

  const statusOf = async (achievementId: string) =>
    (
      await prisma.athleteAchievement.findUniqueOrThrow({
        where: { id: achievementId },
        select: { verificationStatus: true },
      })
    ).verificationStatus;

  /** The stored summary must follow the request history (design risk 4). */
  async function expectSummaryMatchesHistory(achievementId: string): Promise<void> {
    const requests = await prisma.achievementCertificationRequest.findMany({
      where: { achievementId },
      orderBy: { requestedAt: 'desc' },
      select: { status: true },
    });
    const latest = requests[0]?.status;
    const expected =
      latest === undefined || latest === 'CANCELLED'
        ? 'UNVERIFIED'
        : latest === 'PENDING'
          ? 'PENDING'
          : latest === 'APPROVED'
            ? 'VERIFIED'
            : 'REJECTED';
    expect(await statusOf(achievementId)).toBe(expected);
  }

  const requestRow = (id: string) =>
    prisma.achievementCertificationRequest.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        clubId: true,
        decidedByClubTrainerId: true,
        decidedAt: true,
        rejectionReason: true,
      },
    });

  beforeAll(async () => {
    const limits = { public: 100_000, authenticated: 100_000, sensitive: 100_000 };
    server = await startServer(limits, { jobs: recorder });
    failingServer = await startServer(limits, { jobs: failing });
    sportId = await createTestSport();
    [trainerA, trainerA2, trainerB, athlete, other, noAthlete] = await Promise.all([
      createAuthedUser({ sportId, label: 'cert-ta' }),
      createAuthedUser({ sportId, label: 'cert-ta2' }),
      createAuthedUser({ sportId, label: 'cert-tb' }),
      createAuthedUser({ sportId, label: 'cert-athlete' }),
      createAuthedUser({ sportId, label: 'cert-other' }),
      createAuthedUser({ withAthlete: false, label: 'cert-none' }),
    ]);
    for (const key of Object.keys(clubs) as Array<keyof typeof clubs>) {
      clubs[key] = await createTestClub(`cert-${key.toLowerCase().slice(0, 8)}`);
    }
    trainerARow = await addClubTrainer(clubs.A, trainerA.userAccountId);
    await addClubTrainer(clubs.A, trainerA2.userAccountId);
    trainerBRow = await addClubTrainer(clubs.B, trainerB.userAccountId);
    const trainerERow = await addClubTrainer(clubs.E, trainerA.userAccountId);

    const join = async (clubId: string, row: string, status: MembershipStatus) =>
      createTestMembership({ clubId, athleteId: athleteIdOf(athlete), clubTrainerId: row, status });
    await join(clubs.A, trainerARow, 'ACTIVE');
    await join(clubs.B, trainerBRow, 'ACTIVE');
    membershipE = await join(clubs.E, trainerERow, 'ACTIVE');
    for (const status of ['PENDING_ATHLETE_CONFIRMATION', 'COMPLETED', 'REJECTED'] as const) {
      await join(
        clubs[status],
        await addClubTrainer(clubs[status], trainerB.userAccountId),
        status,
      );
    }
  });

  afterAll(async () => {
    for (const clubId of Object.values(clubs)) await cleanupTestClub(clubId);
    for (const u of [trainerA, trainerA2, trainerB, athlete, other, noAthlete]) {
      await cleanupAuthedUser(u);
    }
    await deleteTestSport(sportId);
    await server.close();
    await failingServer.close();
  });

  // ── Authentication, input, not found ──────────────────────────────────────

  describe('authentication and input', () => {
    it('rejects every procedure without a session (401)', async () => {
      const client = as();
      await expectTRPCCode(
        client.achievement.requestCertification.mutate({
          achievementId: UNKNOWN_ID,
          clubId: clubs.A,
        }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(
        client.achievement.withdrawCertification.mutate({ requestId: UNKNOWN_ID }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(
        client.achievement.listMyCertificationRequests.query({}),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(
        client.achievement.listPendingCertifications.query({ clubId: clubs.A }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(
        client.achievement.decideCertification.mutate({
          clubId: clubs.A,
          requestId: UNKNOWN_ID,
          decision: 'APPROVE',
        }),
        'UNAUTHORIZED',
      );
    });

    it('rejects invalid input (Zod)', async () => {
      await expectTRPCCode(
        as(athlete).achievement.requestCertification.mutate({
          achievementId: 'nope',
          clubId: clubs.A,
        }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        as(athlete).achievement.withdrawCertification.mutate({ requestId: 'nope' }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        as(athlete).achievement.listMyCertificationRequests.query({ take: 51 }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        as(trainerA).achievement.listPendingCertifications.query({ clubId: clubs.A, take: 51 }),
        'BAD_REQUEST',
      );
      // Rejecting without a reason is invalid input (spec).
      await expectTRPCCode(
        as(trainerA).achievement.decideCertification.mutate({
          clubId: clubs.A,
          requestId: UNKNOWN_ID,
          decision: 'REJECT',
        } as unknown as { clubId: string; requestId: string; decision: 'APPROVE' }),
        'BAD_REQUEST',
      );
    });

    it('returns 404 for unknown achievements, clubs, requests, and athlete-less accounts', async () => {
      const mine = await newAchievement(athlete, 'Goleador Torneo Ponyfútbol 404');
      await expectTRPCCode(
        as(athlete).achievement.requestCertification.mutate({
          achievementId: UNKNOWN_ID,
          clubId: clubs.A,
        }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(athlete).achievement.requestCertification.mutate({
          achievementId: mine,
          clubId: UNKNOWN_ID,
        }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(athlete).achievement.withdrawCertification.mutate({ requestId: UNKNOWN_ID }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(trainerA).achievement.decideCertification.mutate({
          clubId: clubs.A,
          requestId: UNKNOWN_ID,
          decision: 'APPROVE',
        }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(trainerA).achievement.listPendingCertifications.query({ clubId: UNKNOWN_ID }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(noAthlete).achievement.listMyCertificationRequests.query({}),
        'NOT_FOUND',
      );
      expect(await statusOf(mine)).toBe('UNVERIFIED');
    });
  });

  // ── Requesting ────────────────────────────────────────────────────────────

  describe('requestCertification', () => {
    let achievementId: string;
    let requestId: string;

    it('starts UNVERIFIED, then a request to an ACTIVE club makes it PENDING and notifies its trainers', async () => {
      achievementId = await newAchievement(athlete, 'Campeón Departamental Sub-17');
      expect(await statusOf(achievementId)).toBe('UNVERIFIED');

      const before = enqueued.length;
      const result = await as(athlete).achievement.requestCertification.mutate({
        achievementId,
        clubId: clubs.A,
      });
      requestId = result.id;
      expect(result.status).toBe('PENDING');
      expect(await requestRow(requestId)).toMatchObject({ status: 'PENDING', clubId: clubs.A });
      await expectSummaryMatchesHistory(achievementId);

      const jobs = enqueued.slice(before);
      expect(jobs.map((j) => j.queue)).toEqual(['notifications', 'notifications']);
      expect(
        jobs.map((j) => ('userAccountId' in j.data ? j.data.userAccountId : '')).sort(),
      ).toEqual([trainerA.userAccountId, trainerA2.userAccountId].sort());
      for (const job of jobs) {
        expect(Object.keys(job.data).sort()).toEqual([
          'notificationType',
          'requestId',
          'subjectId',
          'userAccountId',
        ]);
        expect(job.data).toMatchObject({
          notificationType: 'CERTIFICATION_REQUESTED',
          subjectId: requestId,
        });
      }
    });

    it('rejects a second open request, to the same or another club (CONFLICT)', async () => {
      for (const clubId of [clubs.A, clubs.B]) {
        await expectTRPCCode(
          as(athlete).achievement.requestCertification.mutate({ achievementId, clubId }),
          'CONFLICT',
        );
      }
      expect(await prisma.achievementCertificationRequest.count({ where: { achievementId } })).toBe(
        1,
      );
    });

    it("rejects another athlete's achievement (FORBIDDEN)", async () => {
      await expectTRPCCode(
        as(other).achievement.requestCertification.mutate({ achievementId, clubId: clubs.A }),
        'FORBIDDEN',
      );
    });

    for (const key of ['PENDING_ATHLETE_CONFIRMATION', 'COMPLETED', 'REJECTED', 'NONE'] as const) {
      it(`rejects a club where the membership is ${key} (FORBIDDEN) and stores nothing`, async () => {
        const id = await newAchievement(athlete, `Subcampeón Copa ${key}`);
        await expectTRPCCode(
          as(athlete).achievement.requestCertification.mutate({
            achievementId: id,
            clubId: clubs[key],
          }),
          'FORBIDDEN',
        );
        expect(
          await prisma.achievementCertificationRequest.count({ where: { achievementId: id } }),
        ).toBe(0);
        expect(await statusOf(id)).toBe('UNVERIFIED');
      });
    }

    it('rejects an already VERIFIED achievement (BAD_REQUEST)', async () => {
      const id = await prisma.athleteAchievement.create({
        data: {
          athleteId: athleteIdOf(athlete),
          title: 'Campeón Nacional Interclubes (legado)',
          organization: 'Federación Colombiana de Fútbol',
          achievedOn: new Date('2023-11-12'),
          verificationStatus: 'VERIFIED',
        },
        select: { id: true },
      });
      await expectTRPCCode(
        as(athlete).achievement.requestCertification.mutate({
          achievementId: id.id,
          clubId: clubs.A,
        }),
        'BAD_REQUEST',
      );
    });
  });

  // ── Trainer queue and decisions ───────────────────────────────────────────

  describe('trainer queue and decisions', () => {
    let achievementId: string;
    let rejectedId: string;
    let approvedId: string;

    beforeAll(async () => {
      achievementId = await newAchievement(athlete, 'Valla menos vencida Liga Antioquia 2025');
      rejectedId = (
        await as(athlete).achievement.requestCertification.mutate({
          achievementId,
          clubId: clubs.A,
        })
      ).id;
    });

    it("shows the club's pending request with the achievement and the athlete's L0 identity only", async () => {
      const page = await as(trainerA).achievement.listPendingCertifications.query({
        clubId: clubs.A,
      });
      const item = page.items.find((i) => i.id === rejectedId);
      expect(item?.achievement).toMatchObject({
        title: 'Valla menos vencida Liga Antioquia 2025',
        organization: 'Liga Antioqueña de Fútbol',
      });
      expect(item?.athlete.id).toBe(athleteIdOf(athlete));
      const keys = keysOf(page);
      expect([...keys].filter((k) => L2_KEY.test(k))).toEqual([]);
      for (const hidden of [
        'rejectionReason',
        'decidedByClubTrainerId',
        'clubMembershipId',
        'email',
      ]) {
        expect(keys.has(hidden)).toBe(false);
      }
    });

    it("rejects another club's trainer and a non-trainer, for listing and deciding (FORBIDDEN)", async () => {
      for (const caller of [trainerB, other]) {
        await expectTRPCCode(
          as(caller).achievement.listPendingCertifications.query({ clubId: clubs.A }),
          'FORBIDDEN',
        );
        await expectTRPCCode(
          as(caller).achievement.decideCertification.mutate({
            clubId: clubs.A,
            requestId: rejectedId,
            decision: 'APPROVE',
          }),
          'FORBIDDEN',
        );
      }
      // A trainer of B naming their own club cannot reach a request made to A.
      await expectTRPCCode(
        as(trainerB).achievement.decideCertification.mutate({
          clubId: clubs.B,
          requestId: rejectedId,
          decision: 'APPROVE',
        }),
        'FORBIDDEN',
      );
      expect((await requestRow(rejectedId)).status).toBe('PENDING');
    });

    it('rejects with a reason: REJECTED, attributed, achievement REJECTED, athlete notified', async () => {
      const before = enqueued.length;
      const result = await as(trainerA).achievement.decideCertification.mutate({
        clubId: clubs.A,
        requestId: rejectedId,
        decision: 'REJECT',
        rejectionReason: 'La planilla oficial no registra el partido en esa fecha.',
      });
      expect(result).toEqual({ id: rejectedId, status: 'REJECTED' });
      const row = await requestRow(rejectedId);
      expect(row).toMatchObject({
        status: 'REJECTED',
        decidedByClubTrainerId: trainerARow,
        rejectionReason: 'La planilla oficial no registra el partido en esa fecha.',
      });
      expect(row.decidedAt).toBeInstanceOf(Date);
      await expectSummaryMatchesHistory(achievementId);

      const jobs = enqueued.slice(before);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.data).toMatchObject({
        userAccountId: athlete.userAccountId,
        notificationType: 'CERTIFICATION_DECIDED',
        subjectId: rejectedId,
      });
    });

    it('rejects deciding a request that is no longer pending (BAD_REQUEST)', async () => {
      await expectTRPCCode(
        as(trainerA).achievement.decideCertification.mutate({
          clubId: clubs.A,
          requestId: rejectedId,
          decision: 'APPROVE',
        }),
        'BAD_REQUEST',
      );
    });

    it('decided requests leave the queue', async () => {
      const page = await as(trainerA).achievement.listPendingCertifications.query({
        clubId: clubs.A,
      });
      expect(page.items.map((i) => i.id)).not.toContain(rejectedId);
    });

    it('shows the rejection reason to the athlete only', async () => {
      const mine = await as(athlete).achievement.listMyCertificationRequests.query({});
      expect(mine.items.find((r) => r.id === rejectedId)).toMatchObject({
        status: 'REJECTED',
        club: { id: clubs.A },
        rejectionReason: 'La planilla oficial no registra el partido en esa fecha.',
      });
      const theirs = await as(other).achievement.listMyCertificationRequests.query({});
      expect(theirs.items.map((r) => r.id)).not.toContain(rejectedId);
    });

    it('allows a new request at another club after a rejection; the old row is unchanged', async () => {
      approvedId = (
        await as(athlete).achievement.requestCertification.mutate({
          achievementId,
          clubId: clubs.B,
        })
      ).id;
      expect(await statusOf(achievementId)).toBe('PENDING');
      expect((await requestRow(rejectedId)).status).toBe('REJECTED');
    });

    it('approves: APPROVED, attributed to the deciding trainer, achievement VERIFIED', async () => {
      await as(trainerB).achievement.decideCertification.mutate({
        clubId: clubs.B,
        requestId: approvedId,
        decision: 'APPROVE',
      });
      expect(await requestRow(approvedId)).toMatchObject({
        status: 'APPROVED',
        decidedByClubTrainerId: trainerBRow,
        rejectionReason: null,
      });
      await expectSummaryMatchesHistory(achievementId);
      await expectTRPCCode(
        as(athlete).achievement.requestCertification.mutate({ achievementId, clubId: clubs.A }),
        'BAD_REQUEST',
      );
    });
  });

  // ── Withdrawing ───────────────────────────────────────────────────────────

  describe('withdrawCertification', () => {
    let achievementId: string;
    let requestId: string;

    beforeAll(async () => {
      achievementId = await newAchievement(athlete, 'Mejor jugador Festival Pony Fútbol');
      requestId = (
        await as(athlete).achievement.requestCertification.mutate({
          achievementId,
          clubId: clubs.A,
        })
      ).id;
    });

    it('rejects a trainer or another athlete (FORBIDDEN)', async () => {
      for (const caller of [trainerA, other]) {
        await expectTRPCCode(
          as(caller).achievement.withdrawCertification.mutate({ requestId }),
          'FORBIDDEN',
        );
      }
      expect((await requestRow(requestId)).status).toBe('PENDING');
    });

    it('lets the athlete withdraw: CANCELLED and UNVERIFIED; a second withdraw is BAD_REQUEST', async () => {
      expect(await as(athlete).achievement.withdrawCertification.mutate({ requestId })).toEqual({
        id: requestId,
        status: 'CANCELLED',
      });
      await expectSummaryMatchesHistory(achievementId);
      await expectTRPCCode(
        as(athlete).achievement.withdrawCertification.mutate({ requestId }),
        'BAD_REQUEST',
      );
    });

    it('allows a new request after a cancellation', async () => {
      const again = await as(athlete).achievement.requestCertification.mutate({
        achievementId,
        clubId: clubs.A,
      });
      expect(again.status).toBe('PENDING');
      expect((await requestRow(requestId)).status).toBe('CANCELLED');
    });
  });

  // ── Membership ended before the decision ─────────────────────────────────

  it('rejects a decision once the membership is no longer ACTIVE (FORBIDDEN)', async () => {
    const achievementId = await newAchievement(athlete, 'Campeón Torneo Interbarrios');
    const { id: requestId } = await as(athlete).achievement.requestCertification.mutate({
      achievementId,
      clubId: clubs.E,
    });
    // End the membership underneath the request (not through club.leave, which
    // would also cancel it), so the decision-time check is what fires.
    await prisma.clubMembership.update({
      where: { id: membershipE },
      data: { status: 'COMPLETED', endedAt: new Date() },
      select: { id: true },
    });
    await expectTRPCCode(
      as(trainerA).achievement.decideCertification.mutate({
        clubId: clubs.E,
        requestId,
        decision: 'APPROVE',
      }),
      'FORBIDDEN',
    );
    expect(await statusOf(achievementId)).toBe('PENDING');
    expect((await requestRow(requestId)).status).toBe('PENDING');
  });

  // ── Lost notifications never fail the operation ──────────────────────────

  it('stores the request and the decision even when notifications cannot be enqueued', async () => {
    const achievementId = await newAchievement(athlete, 'Subcampeón Copa Antioquia Sub-15');
    const failingAs = (user: AuthedUser) => apiClient(failingServer.url, user.accessToken);
    const { id: requestId } = await failingAs(athlete).achievement.requestCertification.mutate({
      achievementId,
      clubId: clubs.A,
    });
    expect((await requestRow(requestId)).status).toBe('PENDING');

    await failingAs(trainerA).achievement.decideCertification.mutate({
      clubId: clubs.A,
      requestId,
      decision: 'APPROVE',
    });
    expect((await requestRow(requestId)).status).toBe('APPROVED');
    await expectSummaryMatchesHistory(achievementId);
  });
});
