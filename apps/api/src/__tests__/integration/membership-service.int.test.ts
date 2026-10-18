/**
 * Membership service (task 4.1, club-membership spec) — real DB, no mocks.
 *
 * Covers: invitation to own club, cross-club invitation, unknown club /
 * athlete, duplicate open membership, re-invitation after a terminal state,
 * every allowed transition, every disallowed transition, non-athlete actors,
 * and the double-response race.
 */
import './helpers/load-env.js';

import { CLUB_MEMBERSHIP_STATUSES, canTransitionClubMembership } from '@packages/shared-logic';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decideCertification, requestCertification } from '../../services/certification.js';
import {
  inviteAthlete,
  leaveClub,
  requireClubTrainer,
  respondToInvitation,
} from '../../services/membership.js';
import { resolveViewer, type Viewer } from '../../services/viewer.js';

import {
  addClubTrainer,
  cleanupFixtureAthlete,
  cleanupTestClub,
  createFixtureAthlete,
  createTestClub,
  createTestMembership,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
  type FixtureAthlete,
  type MembershipStatus,
} from './helpers/setup.js';

async function viewerOf(fx: FixtureAthlete): Promise<Viewer> {
  const account = await prisma.userAccount.findUniqueOrThrow({
    where: { id: fx.userAccountId },
    select: { supabaseUserId: true },
  });
  const viewer = await resolveViewer(prisma, account.supabaseUserId);
  if (viewer === null) throw new Error('fixture viewer missing');
  return viewer;
}

async function expectCode(call: Promise<unknown>, code: TRPCError['code']): Promise<void> {
  const error = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
}

/** Mirrors trainerProcedure: resolve the caller's trainer row, then invite. */
const invite = async (viewer: Viewer, input: { clubId: string; athleteId: string }) =>
  inviteAthlete(prisma, await requireClubTrainer(prisma, viewer, input.clubId), input);

const statusOf = async (id: string) =>
  (await prisma.clubMembership.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;

describe.skipIf(!dbReady)('membership service', () => {
  let sportId: string;
  let clubA: string;
  let clubB: string;
  let trainerA: FixtureAthlete;
  let trainerB: FixtureAthlete;
  let athlete: FixtureAthlete;
  let other: FixtureAthlete;
  let trainerARow: string;
  let vTrainerA: Viewer;
  let vAthlete: Viewer;
  let vOther: Viewer;

  beforeAll(async () => {
    sportId = await createTestSport();
    const fx = () => createFixtureAthlete(sportId);
    [trainerA, trainerB, athlete, other] = await Promise.all([fx(), fx(), fx(), fx()]);
    clubA = await createTestClub('ms-a');
    clubB = await createTestClub('ms-b');
    trainerARow = await addClubTrainer(clubA, trainerA.userAccountId);
    await addClubTrainer(clubB, trainerB.userAccountId);
    [vTrainerA, vAthlete, vOther] = await Promise.all([
      viewerOf(trainerA),
      viewerOf(athlete),
      viewerOf(other),
    ]);
  });

  afterAll(async () => {
    await cleanupTestClub(clubA);
    await cleanupTestClub(clubB);
    for (const fx of [trainerA, trainerB, athlete, other]) await cleanupFixtureAthlete(fx);
    await deleteTestSport(sportId);
  });

  // Fresh membership per test, so tests stay independent.
  const fresh = async (status: MembershipStatus) => {
    await prisma.clubMembership.deleteMany({ where: { clubId: clubA, athleteId: athlete.athleteId } });
    return createTestMembership({
      clubId: clubA,
      athleteId: athlete.athleteId,
      clubTrainerId: trainerARow,
      status,
    });
  };

  describe('inviteAthlete', () => {
    it('creates a PENDING_ATHLETE_CONFIRMATION membership for a trainer of the club', async () => {
      await prisma.clubMembership.deleteMany({ where: { clubId: clubA } });
      const result = await invite(vTrainerA, { clubId: clubA, athleteId: athlete.athleteId });
      expect(result.status).toBe('PENDING_ATHLETE_CONFIRMATION');
      const row = await prisma.clubMembership.findUniqueOrThrow({
        where: { id: result.id },
        select: { clubId: true, athleteId: true, invitedByClubTrainerId: true },
      });
      expect(row).toEqual({ clubId: clubA, athleteId: athlete.athleteId, invitedByClubTrainerId: trainerARow });
    });

    it('is FORBIDDEN for another club and creates nothing', async () => {
      await expectCode(
        invite(vTrainerA, { clubId: clubB, athleteId: other.athleteId }),
        'FORBIDDEN',
      );
      expect(await prisma.clubMembership.count({ where: { clubId: clubB } })).toBe(0);
    });

    it('is FORBIDDEN for a user who trains no club', async () => {
      await expectCode(
        invite(vOther, { clubId: clubA, athleteId: athlete.athleteId }),
        'FORBIDDEN',
      );
    });

    it('is NOT_FOUND for an unknown club or athlete', async () => {
      await expectCode(
        invite(vTrainerA, { clubId: 'cunknownclub0000000000000', athleteId: athlete.athleteId }),
        'NOT_FOUND',
      );
      await expectCode(
        invite(vTrainerA, { clubId: clubA, athleteId: 'cunknownathlete0000000000' }),
        'NOT_FOUND',
      );
    });

    it('rejects a duplicate open membership (PENDING and ACTIVE)', async () => {
      for (const status of ['PENDING_ATHLETE_CONFIRMATION', 'ACTIVE'] as const) {
        await fresh(status);
        await expectCode(
          invite(vTrainerA, { clubId: clubA, athleteId: athlete.athleteId }),
          'CONFLICT',
        );
        expect(await prisma.clubMembership.count({ where: { clubId: clubA, athleteId: athlete.athleteId } })).toBe(1);
      }
    });

    it('rejects concurrent duplicate invitations via the partial unique index', async () => {
      await prisma.clubMembership.deleteMany({ where: { clubId: clubA, athleteId: athlete.athleteId } });
      const results = await Promise.allSettled(
        [0, 1, 2].map(() =>
          invite(vTrainerA, { clubId: clubA, athleteId: athlete.athleteId }),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await prisma.clubMembership.count({ where: { clubId: clubA, athleteId: athlete.athleteId } })).toBe(1);
    });

    it('allows re-invitation after COMPLETED or REJECTED and leaves the old row unchanged', async () => {
      for (const status of ['COMPLETED', 'REJECTED'] as const) {
        const old = await fresh(status);
        const result = await invite(vTrainerA, { clubId: clubA, athleteId: athlete.athleteId });
        expect(result.id).not.toBe(old);
        expect(result.status).toBe('PENDING_ATHLETE_CONFIRMATION');
        expect(await statusOf(old)).toBe(status);
      }
    });
  });

  describe('transitions', () => {
    it('accept: PENDING → ACTIVE sets respondedAt', async () => {
      const id = await fresh('PENDING_ATHLETE_CONFIRMATION');
      const result = await respondToInvitation(prisma, vAthlete, { membershipId: id, status: 'ACTIVE' });
      expect(result).toEqual({ id, status: 'ACTIVE' });
      const row = await prisma.clubMembership.findUniqueOrThrow({
        where: { id },
        select: { respondedAt: true, endedAt: true },
      });
      expect(row.respondedAt).toBeInstanceOf(Date);
      expect(row.endedAt).toBeNull();
    });

    it('reject: PENDING → REJECTED', async () => {
      const id = await fresh('PENDING_ATHLETE_CONFIRMATION');
      const result = await respondToInvitation(prisma, vAthlete, { membershipId: id, status: 'REJECTED' });
      expect(result.status).toBe('REJECTED');
    });

    it('leave: ACTIVE → COMPLETED sets endedAt', async () => {
      const id = await fresh('ACTIVE');
      const result = await leaveClub(prisma, vAthlete, { membershipId: id });
      expect(result.status).toBe('COMPLETED');
      const row = await prisma.clubMembership.findUniqueOrThrow({ where: { id }, select: { endedAt: true } });
      expect(row.endedAt).toBeInstanceOf(Date);
    });

    // Every edge the API can request, checked against the transition table.
    const requests = [
      { name: 'respond ACTIVE', to: 'ACTIVE', run: (v: Viewer, id: string) => respondToInvitation(prisma, v, { membershipId: id, status: 'ACTIVE' }) },
      { name: 'respond REJECTED', to: 'REJECTED', run: (v: Viewer, id: string) => respondToInvitation(prisma, v, { membershipId: id, status: 'REJECTED' }) },
      { name: 'leave', to: 'COMPLETED', run: (v: Viewer, id: string) => leaveClub(prisma, v, { membershipId: id }) },
    ] as const;

    for (const from of CLUB_MEMBERSHIP_STATUSES) {
      for (const req of requests) {
        if (canTransitionClubMembership(from, req.to)) continue;
        it(`rejects ${req.name} from ${from} and leaves the status unchanged`, async () => {
          const id = await fresh(from);
          await expectCode(req.run(vAthlete, id), 'BAD_REQUEST');
          expect(await statusOf(id)).toBe(from);
        });
      }
    }

    it('is FORBIDDEN for the trainer and for a different athlete', async () => {
      const id = await fresh('PENDING_ATHLETE_CONFIRMATION');
      await expectCode(respondToInvitation(prisma, vTrainerA, { membershipId: id, status: 'ACTIVE' }), 'FORBIDDEN');
      await expectCode(respondToInvitation(prisma, vOther, { membershipId: id, status: 'REJECTED' }), 'FORBIDDEN');
      expect(await statusOf(id)).toBe('PENDING_ATHLETE_CONFIRMATION');
    });

    it('is NOT_FOUND for an unknown membership', async () => {
      await expectCode(leaveClub(prisma, vAthlete, { membershipId: 'cunknownmembership0000000' }), 'NOT_FOUND');
    });

    it('lets exactly one of two concurrent responses win', async () => {
      const id = await fresh('PENDING_ATHLETE_CONFIRMATION');
      const results = await Promise.allSettled([
        respondToInvitation(prisma, vAthlete, { membershipId: id, status: 'ACTIVE' }),
        respondToInvitation(prisma, vAthlete, { membershipId: id, status: 'REJECTED' }),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected');
      expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(TRPCError);
      const winner = fulfilled[0];
      const final = await statusOf(id);
      expect(winner?.status === 'fulfilled' && winner.value.status).toBe(final);
    });
  });
  // achievement-certification spec: "Leaving a club cancels its open
  // requests" and "Certifications outlive the membership" (design D4).
  describe('leaving a club and certification requests', () => {
    let clubC: string;
    let clubD: string;
    let trainerCRow: string;

    beforeAll(async () => {
      clubC = await createTestClub('ms-cert-c');
      clubD = await createTestClub('ms-cert-d');
      trainerCRow = await addClubTrainer(clubC, trainerA.userAccountId);
      await addClubTrainer(clubD, trainerB.userAccountId);
    });

    afterAll(async () => {
      await cleanupTestClub(clubC);
      await cleanupTestClub(clubD);
    });

    const achievement = async (title: string) =>
      (
        await prisma.athleteAchievement.create({
          data: {
            athleteId: athlete.athleteId,
            title,
            organization: 'Liga de Fútbol de Bogotá',
            achievedOn: new Date('2025-09-07'),
          },
          select: { id: true },
        })
      ).id;
    const summary = async (id: string) =>
      (
        await prisma.athleteAchievement.findUniqueOrThrow({
          where: { id },
          select: { verificationStatus: true },
        })
      ).verificationStatus;
    const requestStatus = async (id: string) =>
      (
        await prisma.achievementCertificationRequest.findUniqueOrThrow({
          where: { id },
          select: { status: true },
        })
      ).status;

    it('cancels open requests to that club, keeps its certifications, and leaves other clubs alone', async () => {
      const membershipC = await createTestMembership({
        clubId: clubC,
        athleteId: athlete.athleteId,
        clubTrainerId: trainerCRow,
        status: 'ACTIVE',
      });
      const trainerDRow = await prisma.clubTrainer.findFirstOrThrow({
        where: { clubId: clubD },
        select: { id: true },
      });
      await createTestMembership({
        clubId: clubD,
        athleteId: athlete.athleteId,
        clubTrainerId: trainerDRow.id,
        status: 'ACTIVE',
      });
      const caller = { athleteId: athlete.athleteId };

      const openAtC = await achievement('Campeón Copa Bogotá Sub-16');
      const certifiedByC = await achievement('Goleador Liga Distrital 2025');
      const openAtD = await achievement('Subcampeón Torneo Interclubes');

      const pendingC = await requestCertification(prisma, caller, { achievementId: openAtC, clubId: clubC });
      const approvedC = await requestCertification(prisma, caller, {
        achievementId: certifiedByC,
        clubId: clubC,
      });
      await decideCertification(
        prisma,
        { id: trainerCRow, clubId: clubC },
        { clubId: clubC, requestId: approvedC.id, decision: 'APPROVE' },
      );
      const pendingD = await requestCertification(prisma, caller, { achievementId: openAtD, clubId: clubD });

      await leaveClub(prisma, vAthlete, { membershipId: membershipC });

      expect(await statusOf(membershipC)).toBe('COMPLETED');
      expect(await requestStatus(pendingC.id)).toBe('CANCELLED');
      expect(await summary(openAtC)).toBe('UNVERIFIED');
      expect(await requestStatus(approvedC.id)).toBe('APPROVED');
      expect(await summary(certifiedByC)).toBe('VERIFIED');
      expect(await requestStatus(pendingD.id)).toBe('PENDING');
      expect(await summary(openAtD)).toBe('PENDING');
    });
  });
});
