/**
 * Lock order for club deactivation and trainer revocation (ADR-017, design
 * D7; trainer-provisioning spec "Revocation stops trainer writes already in
 * progress").
 *
 * Deterministic two-connection races: connection 1 opens a transaction that
 * revokes a trainer (club FOR SHARE, trainer row FOR UPDATE, set revoked_at)
 * or deactivates a club (club FOR UPDATE, set deactivated_at) and holds it
 * open. Connection 2 — a real HTTP call — passes requireClubTrainer (it reads
 * committed data) and then blocks on lockActiveClub / lockActiveTrainer. The
 * test waits until Postgres reports that backend waiting on a lock, commits
 * connection 1, and checks the write failed and wrote nothing.
 *
 * This proves the "revocation committed first" branch every time; a write
 * that commits first simply holds its lock and makes the revocation wait.
 */
import './helpers/load-env.js';

import { TRPCClientError } from '@trpc/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppRouter } from '../../router/index.js';
import { acceptInvitation } from '../../services/trainerInvitations.js';

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
  prisma,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

const LOCK_WAIT_TIMEOUT_MS = 15_000;

/** Resolves once some backend is waiting on a `mode` row lock of `table`. */
async function waitForLockWaiter(
  table: 'clubs' | 'club_trainers',
  mode: 'FOR SHARE' | 'FOR UPDATE' = 'FOR SHARE',
): Promise<void> {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE wait_event_type = 'Lock'
        AND query ILIKE ${`%FROM ${table}%${mode}%`}`;
    if ((rows[0]?.n ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`no backend waited on a ${table} row lock within ${LOCK_WAIT_TIMEOUT_MS}ms`);
}

/**
 * Runs `apply` in a transaction that stays open until the returned release()
 * is called; `committed` settles when the transaction has committed.
 */
function heldTransaction(apply: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>) {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markApplied: () => void = () => undefined;
  const applied = new Promise<void>((resolve) => {
    markApplied = resolve;
  });
  const committed = prisma.$transaction(
    async (tx) => {
      await apply(tx);
      markApplied();
      await gate;
    },
    { timeout: LOCK_WAIT_TIMEOUT_MS * 2, maxWait: LOCK_WAIT_TIMEOUT_MS },
  );
  return { applied, release, committed };
}

async function codeOf(call: Promise<unknown>): Promise<string | undefined> {
  const error: unknown = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TRPCClientError);
  return (error as TRPCClientError<AppRouter>).data?.code;
}

describe.skipIf(!authReady)('trainer writes vs revocation and deactivation (lock order)', () => {
  let server: TestServer;
  let sportId: string;
  let definitionId: string;
  let athlete: AuthedUser;
  let trainer: AuthedUser;
  const clubs: string[] = [];

  const as = (user: AuthedUser) => apiClient(server.url, user.accessToken);

  function athleteIdOf(user: AuthedUser): string {
    if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
    return user.athleteId;
  }

  /** A fresh active club where `trainer` trains and `athlete` is ACTIVE. */
  async function freshClub(label: string): Promise<{ clubId: string; trainerRow: string }> {
    const clubId = await createTestClub(label);
    clubs.push(clubId);
    const trainerRow = await addClubTrainer(clubId, trainer.userAccountId);
    await createTestMembership({
      clubId,
      athleteId: athleteIdOf(athlete),
      clubTrainerId: trainerRow,
      status: 'ACTIVE',
    });
    return { clubId, trainerRow };
  }

  const revoke = (clubId: string, trainerRow: string) =>
    heldTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM clubs WHERE id = ${clubId} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM club_trainers WHERE id = ${trainerRow} FOR UPDATE`;
      await tx.clubTrainer.update({
        where: { id: trainerRow },
        data: { revokedAt: new Date() },
        select: { id: true },
      });
    });

  const deactivate = (clubId: string) =>
    heldTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM clubs WHERE id = ${clubId} FOR UPDATE`;
      await tx.club.update({
        where: { id: clubId },
        data: { deactivatedAt: new Date() },
        select: { id: true },
      });
    });

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000, sensitive: 100_000 });
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    [athlete, trainer] = await Promise.all([
      createAuthedUser({ sportId, label: 'race-ath' }),
      createAuthedUser({ withAthlete: false, label: 'race-tr' }),
    ]);
  });

  afterAll(async () => {
    for (const clubId of clubs) await cleanupTestClub(clubId);
    await deleteTestMetricDefinition(definitionId);
    await cleanupAuthedUser(athlete);
    await cleanupAuthedUser(trainer);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('reportEntry blocked behind a revocation is rejected FORBIDDEN and stores nothing', async () => {
    const { clubId, trainerRow } = await freshClub('race-rep');
    const held = revoke(clubId, trainerRow);
    await held.applied;

    const write = as(trainer).metric.reportEntry.mutate({
      clubId,
      athleteId: athleteIdOf(athlete),
      metricDefinitionId: definitionId,
      value: 61.2,
      measuredAt: new Date('2026-10-28T14:00:00Z'),
    });
    await waitForLockWaiter('club_trainers');
    held.release();
    await held.committed;

    expect(await codeOf(write)).toBe('FORBIDDEN');
    expect(
      await prisma.athleteMetricEntry.count({ where: { reportedByClubTrainerId: trainerRow } }),
    ).toBe(0);
  });

  it('decideCertification blocked behind a revocation is rejected and the request stays PENDING', async () => {
    const { clubId, trainerRow } = await freshClub('race-dec');
    const { id: achievementId } = await as(athlete).achievement.addAchievement.mutate({
      title: 'Bronce Panamericano Juvenil',
      organization: 'Panam Sports',
      achievedOn: '2025-07-20',
    });
    const { id: requestId } = await as(athlete).achievement.requestCertification.mutate({
      achievementId,
      clubId,
    });

    const held = revoke(clubId, trainerRow);
    await held.applied;
    const write = as(trainer).achievement.decideCertification.mutate({
      clubId,
      requestId,
      decision: 'APPROVE',
    });
    await waitForLockWaiter('club_trainers');
    held.release();
    await held.committed;

    expect(await codeOf(write)).toBe('FORBIDDEN');
    const row = await prisma.achievementCertificationRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { status: true, decidedByClubTrainerId: true },
    });
    expect(row).toEqual({ status: 'PENDING', decidedByClubTrainerId: null });
  });

  it('requestCertification blocked behind a deactivation is rejected and never created', async () => {
    const { clubId } = await freshClub('race-req');
    const { id: achievementId } = await as(athlete).achievement.addAchievement.mutate({
      title: 'Oro Juegos Nacionales',
      organization: 'Coldeportes',
      achievedOn: '2025-11-02',
    });

    const held = deactivate(clubId);
    await held.applied;
    const write = as(athlete).achievement.requestCertification.mutate({ achievementId, clubId });
    await waitForLockWaiter('clubs');
    held.release();
    await held.committed;

    expect(await codeOf(write)).toBe('FORBIDDEN');
    expect(
      await prisma.achievementCertificationRequest.count({ where: { achievementId, clubId } }),
    ).toBe(0);
    const { verificationStatus } = await prisma.athleteAchievement.findUniqueOrThrow({
      where: { id: achievementId },
      select: { verificationStatus: true },
    });
    expect(verificationStatus).toBe('UNVERIFIED');
  });

  it('inviteAthlete blocked behind a deactivation is rejected and creates no membership', async () => {
    const { clubId } = await freshClub('race-inv');
    const invitee = await createAuthedUser({ sportId, label: 'race-inv' });
    try {
      const held = deactivate(clubId);
      await held.applied;
      const write = as(trainer).club.inviteAthlete.mutate({
        clubId,
        athleteId: athleteIdOf(invitee),
      });
      await waitForLockWaiter('clubs');
      held.release();
      await held.committed;

      expect(await codeOf(write)).toBe('FORBIDDEN');
      expect(
        await prisma.clubMembership.count({ where: { clubId, athleteId: athleteIdOf(invitee) } }),
      ).toBe(0);
    } finally {
      await prisma.clubMembership.deleteMany({ where: { athleteId: athleteIdOf(invitee) } });
      await cleanupAuthedUser(invitee);
    }
  });

  it('a membership accept blocked behind a deactivation is rejected and never becomes ACTIVE', async () => {
    const { clubId, trainerRow } = await freshClub('race-macc');
    const invitee = await createAuthedUser({ sportId, label: 'race-macc' });
    try {
      const membershipId = await createTestMembership({
        clubId,
        athleteId: athleteIdOf(invitee),
        clubTrainerId: trainerRow,
        status: 'PENDING_ATHLETE_CONFIRMATION',
      });
      const held = deactivate(clubId);
      await held.applied;
      const write = as(invitee).club.respondToInvitation.mutate({ membershipId, status: 'ACTIVE' });
      await waitForLockWaiter('clubs');
      held.release();
      await held.committed;

      expect(await codeOf(write)).toBe('BAD_REQUEST');
      const { status } = await prisma.clubMembership.findUniqueOrThrow({
        where: { id: membershipId },
        select: { status: true },
      });
      expect(status).not.toBe('ACTIVE');
    } finally {
      await prisma.clubMembership.deleteMany({ where: { athleteId: athleteIdOf(invitee) } });
      await cleanupAuthedUser(invitee);
    }
  });

  it('a trainer-invitation accept blocked behind a revocation is NOT_FOUND and the row stays revoked', async () => {
    const { clubId, trainerRow } = await freshClub('race-tacc');
    const admin = await prisma.userAccount.create({
      data: { supabaseUserId: `race-admin-${clubId}`, role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    try {
      // Issued before the revocation (a direct insert: inviting an active
      // trainer is otherwise a CONFLICT).
      const email = `race.tacc.${clubId.slice(-8)}@club.co`;
      const { id: invitationId } = await prisma.clubTrainerInvitation.create({
        data: {
          clubId,
          email,
          invitedByUserAccountId: admin.id,
          expiresAt: new Date(Date.now() + 14 * 86_400_000),
        },
        select: { id: true },
      });
      const held = revoke(clubId, trainerRow);
      await held.applied;
      const write = acceptInvitation(
        prisma,
        { supabaseUserId: trainer.supabaseUserId, email },
        invitationId,
      ).then(
        () => 'OK',
        (e: unknown) => (e instanceof Error && 'code' in e ? String(e.code) : 'ERROR'),
      );
      await waitForLockWaiter('club_trainers', 'FOR UPDATE');
      held.release();
      await held.committed;

      expect(await write).toBe('NOT_FOUND');
      const row = await prisma.clubTrainer.findUniqueOrThrow({
        where: { id: trainerRow },
        select: { revokedAt: true },
      });
      expect(row.revokedAt).not.toBeNull();
      const invitation = await prisma.clubTrainerInvitation.findUniqueOrThrow({
        where: { id: invitationId },
        select: { status: true },
      });
      expect(invitation.status).toBe('PENDING');
    } finally {
      await prisma.clubTrainerInvitation.deleteMany({ where: { invitedByUserAccountId: admin.id } });
      await prisma.userAccount.deleteMany({ where: { id: admin.id } });
    }
  });
});
