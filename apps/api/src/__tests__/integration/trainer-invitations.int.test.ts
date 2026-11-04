/**
 * Trainer provisioning service (ADR-017; trainer-provisioning,
 * trainer-access-boundary and platform-admin-access specs) against the real
 * database. Calls services/trainerInvitations.ts directly with the caller's
 * confirmed, lowercased email as ctx.userEmail would carry it; the router's
 * HTTP surface (real sessions) is covered in admin-router.int.test.ts.
 *
 * Also holds the unordered races of trainer writes against the real
 * revokeTrainer (design D7); the deterministic lock-order proofs live in
 * trainer-lock-races.int.test.ts.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { inviteTrainerInput } from '@packages/validators';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { deactivateClub, type AdminActorWithJobs } from '../../services/adminClubs.js';
import { decideCertification, requestCertification } from '../../services/certification.js';
import { requireClubTrainer } from '../../services/membership.js';
import { reportEntry } from '../../services/metrics.js';
import {
  acceptInvitation,
  declineInvitation,
  inviteTrainer,
  listClubTrainerInvitations,
  listClubTrainers,
  listMyInvitations,
  revokeTrainer,
  revokeTrainerInvitation,
  type InvitationCaller,
} from '../../services/trainerInvitations.js';
import { resolveViewer } from '../../services/viewer.js';

import {
  cleanupFixtureAthlete,
  cleanupTestClub,
  createFixtureAthlete,
  createTestClub,
  createTestMembership,
  createTestMetricDefinition,
  createTestSport,
  dbReady,
  deleteTestMetricDefinition,
  deleteTestSport,
  prisma,
  type FixtureAthlete,
} from './helpers/setup.js';

const DAY_MS = 86_400_000;
const UNKNOWN_ID = 'cunknownid000000000000000';

async function expectCode(call: Promise<unknown>, code: TRPCError['code']): Promise<void> {
  const error: unknown = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
}

describe.skipIf(!dbReady)('trainer invitation service', () => {
  let actor: AdminActorWithJobs;
  let adminAccountId: string;
  let sportId: string;
  let definitionId: string;
  let athleteFx: FixtureAthlete;
  const clubIds: string[] = [];
  const createdSupabaseIds: string[] = [];

  const email = (label: string) => `${label}.${randomUUID().slice(0, 8)}@club.co`;

  /** A signed-in person who has no account row yet (accept creates it). */
  function newPerson(label: string): InvitationCaller & { address: string } {
    const supabaseUserId = randomUUID();
    createdSupabaseIds.push(supabaseUserId);
    const address = email(label);
    return { supabaseUserId, email: address, address };
  }

  async function newClub(label: string): Promise<string> {
    const id = await createTestClub(label);
    clubIds.push(id);
    return id;
  }

  async function trainerRefFor(caller: InvitationCaller, clubId: string) {
    const viewer = await resolveViewer(prisma, caller.supabaseUserId);
    if (viewer === null) throw new Error('fixture viewer missing');
    return requireClubTrainer(prisma, viewer, clubId);
  }

  /** Invite and accept: returns the person and their trainer row. */
  async function provisionedTrainer(clubId: string, label: string) {
    const person = newPerson(label);
    const { id } = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    await acceptInvitation(prisma, person, id);
    const ref = await trainerRefFor(person, clubId);
    return { person, ref };
  }

  beforeAll(async () => {
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    athleteFx = await createFixtureAthlete(sportId);
    const admin = await prisma.userAccount.create({
      data: { supabaseUserId: randomUUID(), role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    adminAccountId = admin.id;
    actor = {
      admin: { userAccountId: adminAccountId },
      requestId: 'req-trainer-invitations',
      log: { info: vi.fn(), warn: vi.fn() },
      jobs: { enqueue: () => Promise.resolve() },
    };
  });

  afterAll(async () => {
    for (const id of clubIds) await cleanupTestClub(id);
    const accounts = await prisma.userAccount.findMany({
      where: { supabaseUserId: { in: createdSupabaseIds } },
      select: { id: true },
    });
    const ids = accounts.map((a) => a.id);
    await prisma.clubTrainerInvitation.deleteMany({ where: { acceptedByUserAccountId: { in: ids } } });
    await prisma.clubTrainer.deleteMany({ where: { userAccountId: { in: ids } } });
    await prisma.userAccount.deleteMany({ where: { id: { in: ids } } });
    await prisma.clubTrainerInvitation.deleteMany({ where: { invitedByUserAccountId: adminAccountId } });
    await prisma.adminActionLog.deleteMany({ where: { actorUserAccountId: adminAccountId } });
    await prisma.userAccount.deleteMany({ where: { id: adminAccountId } });
    await cleanupFixtureAthlete(athleteFx);
    await deleteTestMetricDefinition(definitionId);
    await deleteTestSport(sportId);
  });

  // ── Inviting ───────────────────────────────────────────────────────────────

  it('invites an email to an active club: PENDING with a 14-day expiry, logged without the email', async () => {
    const clubId = await newClub('inv-ok');
    const address = email('ana.restrepo');
    const before = Date.now();
    const result = await inviteTrainer(prisma, actor, { clubId, email: address });
    expect(result.state).toBe('PENDING');
    expect(result.expiresAt.getTime() - before).toBeGreaterThanOrEqual(14 * DAY_MS - 5_000);
    expect(result.expiresAt.getTime() - before).toBeLessThanOrEqual(14 * DAY_MS + 5_000);
    const log = await prisma.adminActionLog.findFirstOrThrow({
      where: { targetId: result.id },
      select: { action: true, targetType: true, metadata: true },
    });
    expect(log).toEqual({
      action: 'TRAINER_INVITED',
      targetType: 'club_trainer_invitation',
      metadata: { clubId },
    });
    expect(JSON.stringify(log)).not.toContain(address);
  });

  it('rejects inviting to a deactivated club (BAD_REQUEST) and an unknown club (NOT_FOUND)', async () => {
    const clubId = await newClub('inv-off');
    await deactivateClub(prisma, actor, clubId);
    await expectCode(inviteTrainer(prisma, actor, { clubId, email: email('x') }), 'BAD_REQUEST');
    await expectCode(inviteTrainer(prisma, actor, { clubId: UNKNOWN_ID, email: email('x') }), 'NOT_FOUND');
    expect(await prisma.clubTrainerInvitation.count({ where: { clubId } })).toBe(0);
  });

  it('rejects a case-insensitive duplicate as CONFLICT and leaves the first unchanged', async () => {
    const clubId = await newClub('inv-dup');
    const address = email('ana');
    const first = await inviteTrainer(prisma, actor, { clubId, email: address });
    // A mixed-case address goes through the router's validator, which
    // lowercases it, and must collide with the first invitation.
    await expectCode(
      inviteTrainer(prisma, actor, inviteTrainerInput.parse({ clubId, email: `  ${address.toUpperCase()} ` })),
      'CONFLICT',
    );
    const rows = await prisma.clubTrainerInvitation.findMany({ where: { clubId }, select: { id: true, status: true } });
    expect(rows).toEqual([{ id: first.id, status: 'PENDING' }]);
  });

  it('rejects inviting a non-revoked trainer of the club as CONFLICT', async () => {
    const clubId = await newClub('inv-already');
    const { person } = await provisionedTrainer(clubId, 'carlos');
    await expectCode(inviteTrainer(prisma, actor, { clubId, email: person.address }), 'CONFLICT');
  });

  it('re-invites after expiry, closing the expired row as REVOKED', async () => {
    const clubId = await newClub('inv-exp');
    const person = newPerson('luisa');
    const expired = await prisma.clubTrainerInvitation.create({
      data: {
        clubId,
        email: person.address,
        invitedByUserAccountId: adminAccountId,
        expiresAt: new Date(Date.now() - DAY_MS),
      },
      select: { id: true },
    });
    // Accepting the expired one is rejected and grants nothing.
    await expectCode(acceptInvitation(prisma, person, expired.id), 'NOT_FOUND');
    expect(await prisma.clubTrainer.count({ where: { clubId } })).toBe(0);

    const fresh = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    expect(
      (await prisma.clubTrainerInvitation.findUniqueOrThrow({ where: { id: expired.id }, select: { status: true } })).status,
    ).toBe('REVOKED');
    const list = await listClubTrainerInvitations(prisma, { clubId, take: 20 });
    expect(list.items.map((i) => [i.id, i.state])).toEqual([
      [fresh.id, 'PENDING'],
      [expired.id, 'REVOKED'],
    ]);
  });

  // ── Invitee: only the confirmed, matching email ────────────────────────────

  it('lists, accepts and grants trainer access only to the invited confirmed email', async () => {
    const clubId = await newClub('acc-ok');
    const person = newPerson('mateo');
    const stranger = newPerson('otro');
    const { id } = await inviteTrainer(prisma, actor, { clubId, email: person.address });

    expect((await listMyInvitations(prisma, person)).items.map((i) => i.id)).toEqual([id]);
    expect((await listMyInvitations(prisma, person)).items[0]?.club).toMatchObject({ id: clubId, isActive: true });
    expect((await listMyInvitations(prisma, stranger)).items).toEqual([]);
    expect((await listMyInvitations(prisma, { ...person, email: null })).items).toEqual([]);

    await expectCode(acceptInvitation(prisma, stranger, id), 'NOT_FOUND');
    await expectCode(declineInvitation(prisma, stranger, id), 'NOT_FOUND');
    await expectCode(acceptInvitation(prisma, { ...person, email: null }, id), 'NOT_FOUND');
    await expectCode(declineInvitation(prisma, { ...person, email: null }, id), 'NOT_FOUND');
    expect(
      (await prisma.clubTrainerInvitation.findUniqueOrThrow({ where: { id }, select: { status: true } })).status,
    ).toBe('PENDING');

    const accepted = await acceptInvitation(prisma, person, id);
    expect(accepted).toEqual({ id, state: 'ACCEPTED', clubId });
    const ref = await trainerRefFor(person, clubId);
    expect(ref.clubId).toBe(clubId);
    expect(await listMyInvitations(prisma, person)).toEqual({ items: [] });
  });

  it('declines: DECLINED and no trainer access', async () => {
    const clubId = await newClub('dec');
    const person = newPerson('sofia');
    const { id } = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    expect(await declineInvitation(prisma, person, id)).toEqual({ id, state: 'DECLINED' });
    await expectCode(acceptInvitation(prisma, person, id), 'NOT_FOUND');
    expect(await prisma.clubTrainer.count({ where: { clubId } })).toBe(0);
  });

  it('rejects an athlete, ADMIN or SYSTEM account as FORBIDDEN, leaving the invitation PENDING', async () => {
    const clubId = await newClub('acc-cap');
    const athleteAccount = await prisma.userAccount.findUniqueOrThrow({
      where: { id: athleteFx.userAccountId },
      select: { supabaseUserId: true },
    });
    const athleteCaller = { supabaseUserId: athleteAccount.supabaseUserId, email: email('deportista') };
    const adminCaller = {
      supabaseUserId: (
        await prisma.userAccount.findUniqueOrThrow({ where: { id: adminAccountId }, select: { supabaseUserId: true } })
      ).supabaseUserId,
      email: email('admin'),
    };
    const systemSupabaseId = randomUUID();
    createdSupabaseIds.push(systemSupabaseId);
    await prisma.userAccount.create({
      data: { supabaseUserId: systemSupabaseId, role: 'SYSTEM', status: 'ACTIVE' },
      select: { id: true },
    });
    const systemCaller = { supabaseUserId: systemSupabaseId, email: email('sistema') };
    for (const caller of [athleteCaller, adminCaller, systemCaller]) {
      const { id } = await inviteTrainer(prisma, actor, { clubId, email: caller.email });
      await expectCode(acceptInvitation(prisma, caller, id), 'FORBIDDEN');
      expect(
        (await prisma.clubTrainerInvitation.findUniqueOrThrow({ where: { id }, select: { status: true } })).status,
      ).toBe('PENDING');
    }
    expect(await prisma.clubTrainer.count({ where: { clubId } })).toBe(0);
  });

  it('answers NOT_FOUND (never FORBIDDEN) for a club deactivated meanwhile', async () => {
    const clubId = await newClub('acc-off');
    const person = newPerson('andres');
    const a = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    await deactivateClub(prisma, actor, clubId);
    await expectCode(acceptInvitation(prisma, person, a.id), 'NOT_FOUND');
    await expectCode(declineInvitation(prisma, person, a.id), 'NOT_FOUND');
    expect(await prisma.clubTrainer.count({ where: { clubId } })).toBe(0);
  });

  // ── Revocation ─────────────────────────────────────────────────────────────

  it('revokes a pending invitation once; a second revoke is BAD_REQUEST', async () => {
    const clubId = await newClub('rev-inv');
    const person = newPerson('valeria');
    const { id } = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    expect(await revokeTrainerInvitation(prisma, actor, id)).toEqual({ id, state: 'REVOKED' });
    await expectCode(revokeTrainerInvitation(prisma, actor, id), 'BAD_REQUEST');
    await expectCode(revokeTrainerInvitation(prisma, actor, UNKNOWN_ID), 'NOT_FOUND');
    await expectCode(acceptInvitation(prisma, person, id), 'NOT_FOUND');
  });

  it('revokes a trainer: access ends, attribution stays, return after re-invite restores the row', async () => {
    const clubId = await newClub('rev-tr');
    const { person, ref } = await provisionedTrainer(clubId, 'julian');
    await createTestMembership({ clubId, athleteId: athleteFx.athleteId, clubTrainerId: ref.id, status: 'ACTIVE' });
    const entry = await reportEntry(prisma, ref, {
      athleteId: athleteFx.athleteId,
      metricDefinitionId: definitionId,
      value: 42,
      measuredAt: new Date('2026-10-15T14:00:00Z'),
    });

    const revoked = await revokeTrainer(prisma, actor, ref.id);
    expect(revoked).toMatchObject({ id: ref.id, status: 'REVOKED' });
    await expectCode(revokeTrainer(prisma, actor, ref.id), 'BAD_REQUEST');
    await expectCode(revokeTrainer(prisma, actor, UNKNOWN_ID), 'NOT_FOUND');
    await expectCode(trainerRefFor(person, clubId), 'FORBIDDEN');
    expect(
      (await prisma.athleteMetricEntry.findUniqueOrThrow({ where: { id: entry.id }, select: { reportedByClubTrainerId: true } }))
        .reportedByClubTrainerId,
    ).toBe(ref.id);

    const trainers = await listClubTrainers(prisma, { clubId, take: 20 });
    expect(trainers.items).toEqual([
      expect.objectContaining({ id: ref.id, status: 'REVOKED', invitedEmail: person.address }),
    ]);

    // Return after revocation: same row, revokedAt cleared.
    const [first] = await prisma.clubTrainerInvitation.findMany({
      where: { clubId, status: 'ACCEPTED' },
      select: { id: true, respondedAt: true },
    });
    if (first === undefined) throw new Error('fixture: first accepted invitation missing');
    const again = await inviteTrainer(prisma, actor, { clubId, email: person.address });
    await acceptInvitation(prisma, person, again.id);
    expect(await trainerRefFor(person, clubId)).toEqual({ id: ref.id, clubId });
    expect(await prisma.clubTrainer.count({ where: { clubId } })).toBe(1);
    expect((await listClubTrainers(prisma, { clubId, take: 20 })).items[0]).toMatchObject({
      status: 'ACTIVE',
      revokedAt: null,
      invitedEmail: person.address,
    });

    // The superseded accepted invitation is redacted at once (its status and
    // dates kept); the new one carries the email.
    const old = await prisma.clubTrainerInvitation.findUniqueOrThrow({
      where: { id: first.id },
      select: { email: true, status: true, redactedAt: true, respondedAt: true },
    });
    expect(old).toMatchObject({ email: `redacted:${first.id}`, status: 'ACCEPTED', respondedAt: first.respondedAt });
    expect(old.redactedAt).not.toBeNull();
    const current = await prisma.clubTrainerInvitation.findUniqueOrThrow({
      where: { id: again.id },
      select: { email: true, redactedAt: true },
    });
    expect(current).toEqual({ email: person.address, redactedAt: null });
  });

  it('a revocation voids invitations created before it: accepting one is NOT_FOUND', async () => {
    const clubId = await newClub('rev-old');
    const { person, ref } = await provisionedTrainer(clubId, 'mariana');
    // Issued while the trainer is active (a direct insert: inviting an active
    // trainer is otherwise a CONFLICT), then the trainer is revoked.
    const { id: oldId } = await prisma.clubTrainerInvitation.create({
      data: {
        clubId,
        email: person.address,
        invitedByUserAccountId: adminAccountId,
        expiresAt: new Date(Date.now() + 14 * DAY_MS),
      },
      select: { id: true },
    });
    await revokeTrainer(prisma, actor, ref.id);

    await expectCode(acceptInvitation(prisma, person, oldId), 'NOT_FOUND');
    await expectCode(trainerRefFor(person, clubId), 'FORBIDDEN');
    const row = await prisma.clubTrainer.findUniqueOrThrow({ where: { id: ref.id }, select: { revokedAt: true } });
    expect(row.revokedAt).not.toBeNull();
    const old = await prisma.clubTrainerInvitation.findUniqueOrThrow({
      where: { id: oldId },
      select: { status: true, email: true },
    });
    expect(old).toEqual({ status: 'PENDING', email: person.address });
  });

  it('shows the originally invited address even if the sign-in email changed', async () => {
    const clubId = await newClub('inv-email');
    const { person } = await provisionedTrainer(clubId, 'camila');
    // The session email no longer matters once the row exists.
    const renamed = { ...person, email: email('camila.nuevo') };
    expect((await listMyInvitations(prisma, renamed)).items).toEqual([]);
    const trainers = await listClubTrainers(prisma, { clubId, take: 20 });
    expect(trainers.items[0]?.invitedEmail).toBe(person.address);
  });

  it('lists NOT_FOUND for an unknown club', async () => {
    await expectCode(listClubTrainers(prisma, { clubId: UNKNOWN_ID, take: 20 }), 'NOT_FOUND');
    await expectCode(listClubTrainerInvitations(prisma, { clubId: UNKNOWN_ID, take: 20 }), 'NOT_FOUND');
  });

  // ── Races against the real revokeTrainer (design D7) ───────────────────────

  it('reportEntry racing revokeTrainer: committed before the revocation, or FORBIDDEN', async () => {
    for (let round = 0; round < 3; round++) {
      const clubId = await newClub(`race-rep-${round}`);
      const { ref } = await provisionedTrainer(clubId, `race${round}`);
      await createTestMembership({ clubId, athleteId: athleteFx.athleteId, clubTrainerId: ref.id, status: 'ACTIVE' });

      const [write] = await Promise.allSettled([
        reportEntry(prisma, ref, {
          athleteId: athleteFx.athleteId,
          metricDefinitionId: definitionId,
          value: 50 + round,
          measuredAt: new Date('2026-10-20T14:00:00Z'),
        }),
        revokeTrainer(prisma, actor, ref.id),
      ]);

      const { revokedAt } = await prisma.clubTrainer.findUniqueOrThrow({ where: { id: ref.id }, select: { revokedAt: true } });
      expect(revokedAt).not.toBeNull();
      const entries = await prisma.athleteMetricEntry.findMany({
        where: { reportedByClubTrainerId: ref.id },
        select: { createdAt: true },
      });
      if (write.status === 'fulfilled') {
        expect(entries).toHaveLength(1);
        expect(entries[0]?.createdAt.getTime()).toBeLessThanOrEqual(revokedAt?.getTime() ?? 0);
      } else {
        expect(write.reason).toBeInstanceOf(TRPCError);
        expect((write.reason as TRPCError).code).toBe('FORBIDDEN');
        expect(entries).toHaveLength(0);
      }
    }
  });

  it('decideCertification racing revokeTrainer: decided before the revocation, or still PENDING', async () => {
    for (let round = 0; round < 3; round++) {
      const clubId = await newClub(`race-dec-${round}`);
      const { ref } = await provisionedTrainer(clubId, `racedec${round}`);
      await createTestMembership({ clubId, athleteId: athleteFx.athleteId, clubTrainerId: ref.id, status: 'ACTIVE' });
      const { id: achievementId } = await prisma.athleteAchievement.create({
        data: { athleteId: athleteFx.athleteId, title: `Final Nacional ${round}`, organization: 'Fedeatletismo', achievedOn: new Date('2025-05-04') },
        select: { id: true },
      });
      const request = await requestCertification(prisma, { athleteId: athleteFx.athleteId }, { achievementId, clubId });

      const [decision] = await Promise.allSettled([
        decideCertification(prisma, ref, { clubId, requestId: request.id, decision: 'APPROVE' }),
        revokeTrainer(prisma, actor, ref.id),
      ]);

      const row = await prisma.achievementCertificationRequest.findUniqueOrThrow({
        where: { id: request.id },
        select: { status: true, decidedAt: true },
      });
      const { revokedAt } = await prisma.clubTrainer.findUniqueOrThrow({ where: { id: ref.id }, select: { revokedAt: true } });
      if (decision.status === 'fulfilled') {
        expect(row.status).toBe('APPROVED');
        expect(row.decidedAt?.getTime()).toBeLessThanOrEqual(revokedAt?.getTime() ?? 0);
      } else {
        expect((decision.reason as TRPCError).code).toBe('FORBIDDEN');
        expect(row.status).toBe('PENDING');
      }
    }
  });
});
