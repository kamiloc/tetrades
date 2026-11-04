/**
 * Club administration service (ADR-017; club-administration,
 * achievement-certification, club-membership and membership-notifications
 * specs) against the real database. Calls services/adminClubs.ts directly;
 * the admin router's HTTP surface is covered in admin-router.int.test.ts.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { QueueJobData, QueueName } from '@packages/queue';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';
import {
  createClub,
  deactivateClub,
  getClub,
  listClubs,
  reactivateClub,
  updateClub,
  type AdminActorWithJobs,
} from '../../services/adminClubs.js';
import { decideCertification, requestCertification } from '../../services/certification.js';
import { requireClubTrainer, respondToInvitation } from '../../services/membership.js';
import { resolveViewer, type Viewer } from '../../services/viewer.js';

import {
  addClubTrainer,
  cleanupFixtureAthlete,
  cleanupFixtureTrainer,
  cleanupTestClub,
  createFixtureAthlete,
  createFixtureTrainer,
  createTestMembership,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
  type FixtureAthlete,
  type FixtureTrainer,
} from './helpers/setup.js';

const UNKNOWN_ID = 'cunknownid000000000000000';

interface Enqueued {
  queue: QueueName;
  data: QueueJobData[QueueName];
}

async function expectCode(call: Promise<unknown>, code: TRPCError['code']): Promise<void> {
  const error: unknown = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
}

async function viewerOf(fx: { userAccountId: string }): Promise<Viewer> {
  const { supabaseUserId } = await prisma.userAccount.findUniqueOrThrow({
    where: { id: fx.userAccountId },
    select: { supabaseUserId: true },
  });
  const viewer = await resolveViewer(prisma, supabaseUserId);
  if (viewer === null) throw new Error('fixture viewer missing');
  return viewer;
}

describe.skipIf(!dbReady)('admin club service', () => {
  const enqueued: Enqueued[] = [];
  const recorder: JobEnqueuer = {
    enqueue(queue, data) {
      enqueued.push({ queue, data });
      return Promise.resolve();
    },
  };
  const info = vi.fn();
  const warn = vi.fn();
  let actor: AdminActorWithJobs;
  let adminAccountId: string;
  let sportId: string;
  let trainer: FixtureTrainer;
  let athletes: FixtureAthlete[] = [];
  const clubIds: string[] = [];

  const actorWith = (jobs: JobEnqueuer): AdminActorWithJobs => ({
    ...actor,
    jobs,
    requestId: `req-${randomUUID().slice(0, 8)}`,
  });

  const slug = (label: string) => `liga-${label}-${randomUUID().slice(0, 8)}`;

  async function newClub(label: string) {
    const club = await createClub(prisma, actor, {
      slug: slug(label),
      name: `Liga Vallecaucana de ${label}`,
      countryCode: 'CO',
      city: 'Cali',
    });
    clubIds.push(club.id);
    return club;
  }

  const logRows = (targetId: string) =>
    prisma.adminActionLog.findMany({
      where: { targetId },
      orderBy: { createdAt: 'asc' },
      select: { action: true, actorUserAccountId: true, requestId: true, metadata: true },
    });

  beforeAll(async () => {
    sportId = await createTestSport();
    const admin = await prisma.userAccount.create({
      data: { supabaseUserId: randomUUID(), role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    adminAccountId = admin.id;
    actor = {
      admin: { userAccountId: adminAccountId },
      requestId: 'req-admin-clubs',
      log: { info, warn },
      jobs: recorder,
    };
    trainer = await createFixtureTrainer();
    athletes = await Promise.all([
      createFixtureAthlete(sportId),
      createFixtureAthlete(sportId),
      createFixtureAthlete(sportId),
    ]);
  });

  afterAll(async () => {
    for (const id of clubIds) await cleanupTestClub(id);
    for (const fx of athletes) await cleanupFixtureAthlete(fx);
    await cleanupFixtureTrainer(trainer);
    await prisma.adminActionLog.deleteMany({ where: { actorUserAccountId: adminAccountId } });
    await prisma.userAccount.deleteMany({ where: { id: adminAccountId } });
    await deleteTestSport(sportId);
  });

  // ── Create, edit, read ─────────────────────────────────────────────────────

  it('creates an active club and records CLUB_CREATED', async () => {
    const club = await newClub('atletismo');
    expect(club).toMatchObject({ isActive: true, deactivatedAt: null, activeTrainerCount: 0 });
    expect(await logRows(club.id)).toEqual([
      {
        action: 'CLUB_CREATED',
        actorUserAccountId: adminAccountId,
        requestId: 'req-admin-clubs',
        metadata: {},
      },
    ]);
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CLUB_CREATED', targetId: club.id, requestId: 'req-admin-clubs' }),
      expect.any(String),
    );
  });

  it('rejects a used slug as CONFLICT, even of a deactivated club, and records nothing', async () => {
    const club = await newClub('natacion');
    await deactivateClub(prisma, actor, club.id);
    const before = await prisma.adminActionLog.count({ where: { actorUserAccountId: adminAccountId } });
    await expectCode(
      createClub(prisma, actor, { slug: club.slug, name: 'Otro Club', countryCode: 'CO' }),
      'CONFLICT',
    );
    expect(await prisma.club.count({ where: { slug: club.slug } })).toBe(1);
    expect(await prisma.adminActionLog.count({ where: { actorUserAccountId: adminAccountId } })).toBe(
      before,
    );
  });

  it('edits name and city, keeps the slug, and logs the field names only', async () => {
    const club = await newClub('ciclismo');
    const updated = await updateClub(prisma, actor, {
      clubId: club.id,
      name: 'Liga de Ciclismo del Valle',
      city: 'Palmira',
    });
    expect(updated).toMatchObject({ name: 'Liga de Ciclismo del Valle', city: 'Palmira', slug: club.slug });
    const rows = await logRows(club.id);
    expect(rows[1]).toMatchObject({
      action: 'CLUB_UPDATED',
      metadata: { changedFields: ['name', 'city'] },
    });
    expect(JSON.stringify(rows[1]?.metadata)).not.toContain('Palmira');
  });

  it('returns NOT_FOUND for an unknown club on every operation', async () => {
    await expectCode(updateClub(prisma, actor, { clubId: UNKNOWN_ID, name: 'Nadie' }), 'NOT_FOUND');
    await expectCode(getClub(prisma, UNKNOWN_ID), 'NOT_FOUND');
    await expectCode(deactivateClub(prisma, actor, UNKNOWN_ID), 'NOT_FOUND');
    await expectCode(reactivateClub(prisma, actor, UNKNOWN_ID), 'NOT_FOUND');
    expect(await logRows(UNKNOWN_ID)).toEqual([]);
  });

  it('lists clubs newest first, filtered by status, with active trainer counts', async () => {
    const active = await newClub('voleibol');
    const inactive = await newClub('baloncesto');
    const row = await addClubTrainer(active.id, trainer.userAccountId);
    const revokedTrainer = await createFixtureTrainer();
    try {
      const revokedRow = await addClubTrainer(active.id, revokedTrainer.userAccountId);
      await prisma.clubTrainer.update({ where: { id: revokedRow }, data: { revokedAt: new Date() }, select: { id: true } });
      await deactivateClub(prisma, actor, inactive.id);

      const onlyActive = await listClubs(prisma, { take: 50, status: 'ACTIVE' });
      expect(onlyActive.items.every((c) => c.isActive)).toBe(true);
      expect(onlyActive.items.find((c) => c.id === active.id)?.activeTrainerCount).toBe(1);

      const onlyInactive = await listClubs(prisma, { take: 50, status: 'DEACTIVATED' });
      expect(onlyInactive.items.every((c) => !c.isActive)).toBe(true);
      expect(onlyInactive.items.map((c) => c.id)).toContain(inactive.id);

      const all = await listClubs(prisma, { take: 2, status: 'ALL' });
      expect(all.items).toHaveLength(2);
      expect(all.nextCursor).not.toBeNull();
      const created = all.items.map((c) => c.createdAt.getTime());
      expect(created[0]).toBeGreaterThanOrEqual(created[1] ?? 0);
    } finally {
      await prisma.clubTrainer.deleteMany({ where: { id: row } });
      await cleanupFixtureTrainer(revokedTrainer);
    }
  });

  // ── Deactivation cascade ───────────────────────────────────────────────────

  it('deactivates in one operation: closes pending items, keeps history', async () => {
    const club = await newClub('futbol');
    const [activeMember, invitee, other] = athletes as [FixtureAthlete, FixtureAthlete, FixtureAthlete];
    const trainerRow = await addClubTrainer(club.id, trainer.userAccountId);
    const activeMembership = await createTestMembership({
      clubId: club.id, athleteId: activeMember.athleteId, clubTrainerId: trainerRow, status: 'ACTIVE',
    });
    const pendingMembership = await createTestMembership({
      clubId: club.id, athleteId: invitee.athleteId, clubTrainerId: trainerRow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    const mkAchievement = (title: string) =>
      prisma.athleteAchievement.create({
        data: { athleteId: activeMember.athleteId, title, organization: 'Liga Vallecaucana de Fútbol', achievedOn: new Date('2025-06-01') },
        select: { id: true },
      });
    const verified = await mkAchievement('Campeón Departamental 2025');
    const open = await mkAchievement('Subcampeón Copa Valle 2025');
    const caller = { athleteId: activeMember.athleteId };
    const approved = await requestCertification(prisma, caller, { achievementId: verified.id, clubId: club.id });
    await decideCertification(prisma, { id: trainerRow, clubId: club.id }, {
      clubId: club.id, requestId: approved.id, decision: 'APPROVE',
    });
    const pendingRequest = await requestCertification(prisma, caller, { achievementId: open.id, clubId: club.id });
    const trainerInvitation = await prisma.clubTrainerInvitation.create({
      data: {
        clubId: club.id,
        email: `paola.rengifo.${randomUUID().slice(0, 6)}@club.co`,
        invitedByUserAccountId: adminAccountId,
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      },
      select: { id: true },
    });

    enqueued.length = 0;
    const result = await deactivateClub(prisma, actorWith(recorder), club.id);

    expect(result).toMatchObject({
      club: { id: club.id, isActive: false },
      cancelledCertificationRequests: 1,
      rejectedMembershipInvitations: 1,
      revokedTrainerInvitations: 1,
    });
    const status = async () => ({
      request: (await prisma.achievementCertificationRequest.findUniqueOrThrow({ where: { id: pendingRequest.id }, select: { status: true } })).status,
      openAchievement: (await prisma.athleteAchievement.findUniqueOrThrow({ where: { id: open.id }, select: { verificationStatus: true } })).verificationStatus,
      verifiedAchievement: (await prisma.athleteAchievement.findUniqueOrThrow({ where: { id: verified.id }, select: { verificationStatus: true } })).verificationStatus,
      approvedRequest: (await prisma.achievementCertificationRequest.findUniqueOrThrow({ where: { id: approved.id }, select: { status: true, clubId: true } })),
      pendingMembership: (await prisma.clubMembership.findUniqueOrThrow({ where: { id: pendingMembership }, select: { status: true } })).status,
      activeMembership: (await prisma.clubMembership.findUniqueOrThrow({ where: { id: activeMembership }, select: { status: true } })).status,
      trainerInvitation: (await prisma.clubTrainerInvitation.findUniqueOrThrow({ where: { id: trainerInvitation.id }, select: { status: true } })).status,
      trainerRow: await prisma.clubTrainer.count({ where: { id: trainerRow, revokedAt: null } }),
    });
    expect(await status()).toEqual({
      request: 'CANCELLED',
      openAchievement: 'UNVERIFIED',
      verifiedAchievement: 'VERIFIED',
      approvedRequest: { status: 'APPROVED', clubId: club.id },
      pendingMembership: 'REJECTED',
      activeMembership: 'ACTIVE',
      trainerInvitation: 'REVOKED',
      trainerRow: 1,
    });

    // One push per closed invitation, ids only.
    expect(enqueued).toEqual([
      {
        queue: 'notifications',
        data: {
          userAccountId: invitee.userAccountId,
          notificationType: 'CLUB_INVITATION_CLOSED',
          subjectId: pendingMembership,
          requestId: expect.any(String),
        },
      },
    ]);

    // The log records counts only — no email, no names.
    const log = (await logRows(club.id)).at(-1);
    expect(log).toMatchObject({
      action: 'CLUB_DEACTIVATED',
      metadata: { cancelledCertificationRequests: 1, rejectedMembershipInvitations: 1, revokedTrainerInvitations: 1 },
    });
    expect(JSON.stringify(log?.metadata)).not.toMatch(/@/);

    // While deactivated: trainers have no access, the athlete can't accept
    // the closed invitation, and the ACTIVE member can still leave.
    await expectCode(requireClubTrainer(prisma, await viewerOf(trainer), club.id), 'FORBIDDEN');
    await expectCode(
      respondToInvitation(prisma, await viewerOf(invitee), { membershipId: pendingMembership, status: 'ACTIVE' }),
      'BAD_REQUEST',
    );
    expect(
      (await prisma.clubMembership.findUniqueOrThrow({ where: { id: pendingMembership }, select: { status: true } })).status,
    ).toBe('REJECTED');

    // Reactivation: access returns, cancelled items stay cancelled, and the
    // athlete can request certification again.
    const reactivated = await reactivateClub(prisma, actor, club.id);
    expect(reactivated.isActive).toBe(true);
    await expect(requireClubTrainer(prisma, await viewerOf(trainer), club.id)).resolves.toEqual({
      id: trainerRow,
      clubId: club.id,
    });
    const after = await status();
    expect(after).toMatchObject({ request: 'CANCELLED', pendingMembership: 'REJECTED', trainerInvitation: 'REVOKED' });
    const again = await requestCertification(prisma, caller, { achievementId: open.id, clubId: club.id });
    expect(again.status).toBe('PENDING');
    expect((await logRows(club.id)).at(-1)?.action).toBe('CLUB_REACTIVATED');

    // `other` is untouched by the whole flow.
    expect(await prisma.clubMembership.count({ where: { athleteId: other.athleteId, clubId: club.id } })).toBe(0);
  });

  it('rejects deactivating twice and reactivating an active club, recording nothing', async () => {
    const club = await newClub('tenis');
    await deactivateClub(prisma, actor, club.id);
    const count = async () => prisma.adminActionLog.count({ where: { targetId: club.id } });
    const before = await count();
    await expectCode(deactivateClub(prisma, actor, club.id), 'BAD_REQUEST');
    await reactivateClub(prisma, actor, club.id);
    await expectCode(reactivateClub(prisma, actor, club.id), 'BAD_REQUEST');
    expect(await count()).toBe(before + 1);
  });

  it('still deactivates when the closed-invitation push cannot be enqueued', async () => {
    const club = await newClub('patinaje');
    const trainerRow = await addClubTrainer(club.id, trainer.userAccountId);
    const [, invitee] = athletes as [FixtureAthlete, FixtureAthlete];
    const membershipId = await createTestMembership({
      clubId: club.id, athleteId: invitee.athleteId, clubTrainerId: trainerRow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    const failing: JobEnqueuer = { enqueue: () => Promise.reject(new Error('redis down')) };
    warn.mockClear();

    const result = await deactivateClub(prisma, actorWith(failing), club.id);

    expect(result.club.isActive).toBe(false);
    expect(
      (await prisma.clubMembership.findUniqueOrThrow({ where: { id: membershipId }, select: { status: true } })).status,
    ).toBe('REJECTED');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'club_invitation_closed_notification_not_enqueued', membershipId }),
      expect.any(String),
    );
  });

  it('a certification request racing deactivation ends CANCELLED or never created', async () => {
    for (let round = 0; round < 3; round++) {
      const club = await newClub(`carrera-${round}`);
      const [member] = athletes as [FixtureAthlete];
      const trainerRow = await addClubTrainer(club.id, trainer.userAccountId);
      await createTestMembership({
        clubId: club.id, athleteId: member.athleteId, clubTrainerId: trainerRow, status: 'ACTIVE',
      });
      const { id: achievementId } = await prisma.athleteAchievement.create({
        data: { athleteId: member.athleteId, title: `Podio Válida ${round}`, organization: 'Fedepatín', achievedOn: new Date('2025-03-09') },
        select: { id: true },
      });

      await Promise.allSettled([
        requestCertification(prisma, { athleteId: member.athleteId }, { achievementId, clubId: club.id }),
        deactivateClub(prisma, actor, club.id),
      ]);

      const requests = await prisma.achievementCertificationRequest.findMany({
        where: { achievementId },
        select: { status: true },
      });
      expect(requests.every((r) => r.status === 'CANCELLED')).toBe(true);
      const { verificationStatus } = await prisma.athleteAchievement.findUniqueOrThrow({
        where: { id: achievementId },
        select: { verificationStatus: true },
      });
      expect(verificationStatus).toBe('UNVERIFIED');
    }
  });
});
