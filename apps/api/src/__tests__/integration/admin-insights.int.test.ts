/**
 * Admin insights service (add-web-admin-insights; admin-platform-insights
 * and club-administration specs) against the shared dev database. Calls
 * services/adminInsights.ts and adminClubs.listClubs directly; the HTTP
 * surface (401/403/400) is covered in admin-router.int.test.ts.
 *
 * Other runs share the database, so counts are asserted as DELTAS around
 * fixtures (design D5), and list assertions filter to fixture clubs.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { AdminOverviewOutput } from '@packages/validators';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';
import {
  createClub,
  deactivateClub,
  listClubs,
  reactivateClub,
  updateClub,
  type AdminActorWithJobs,
} from '../../services/adminClubs.js';
import {
  createCachedEmailLookup,
  getOverview,
  listActions,
  listTrainers,
  type AdminEmailLookup,
} from '../../services/adminInsights.js';
import {
  inviteTrainer,
  listClubTrainers,
  revokeTrainer,
  revokeTrainerInvitation,
} from '../../services/trainerInvitations.js';

import {
  addClubTrainer,
  cleanupFixtureTrainer,
  cleanupTestClub,
  createFixtureTrainer,
  dbReady,
  prisma,
  type FixtureTrainer,
} from './helpers/setup.js';

const HOUR_MS = 60 * 60 * 1000;
const OTHER_ADMIN_EMAIL = 'mariana.cardenas@ligas.co';

type Counts = Omit<AdminOverviewOutput, 'generatedAt'>;

function delta(before: AdminOverviewOutput, after: AdminOverviewOutput): Counts {
  return {
    activeClubs: after.activeClubs - before.activeClubs,
    deactivatedClubs: after.deactivatedClubs - before.deactivatedClubs,
    activeClubsWithoutTrainer: after.activeClubsWithoutTrainer - before.activeClubsWithoutTrainer,
    activeTrainers: after.activeTrainers - before.activeTrainers,
    pendingTrainerInvitations: after.pendingTrainerInvitations - before.pendingTrainerInvitations,
    expiringTrainerInvitations:
      after.expiringTrainerInvitations - before.expiringTrainerInvitations,
  };
}

const ZERO: Counts = {
  activeClubs: 0,
  deactivatedClubs: 0,
  activeClubsWithoutTrainer: 0,
  activeTrainers: 0,
  pendingTrainerInvitations: 0,
  expiringTrainerInvitations: 0,
};

describe.skipIf(!dbReady)('admin insights service', () => {
  const noJobs: JobEnqueuer = { enqueue: () => Promise.resolve() };
  const warn = vi.fn();
  let actor: AdminActorWithJobs;
  let otherActor: AdminActorWithJobs;
  let adminAccountIds: string[] = [];
  let otherSupabaseUserId: string;
  const trainers: FixtureTrainer[] = [];
  const clubIds: string[] = [];
  const marker = randomUUID().slice(0, 8);

  async function newClub(label: string, as: AdminActorWithJobs = actor) {
    const club = await createClub(prisma, as, {
      slug: `liga-${label.toLowerCase().replace(/\s+/g, '-')}-${marker}-${randomUUID().slice(0, 4)}`,
      name: `Liga Boyacense de ${label} ${marker}`,
      countryCode: 'CO',
      city: 'Tunja',
    });
    clubIds.push(club.id);
    return club;
  }

  async function newTrainer(): Promise<FixtureTrainer> {
    const trainer = await createFixtureTrainer();
    trainers.push(trainer);
    return trainer;
  }

  /** A PENDING invitation inserted directly, so its expiry can be set. */
  async function pendingInvitation(clubId: string, expiresInMs: number) {
    return prisma.clubTrainerInvitation.create({
      data: {
        clubId,
        email: `inv-${randomUUID().slice(0, 8)}@ligas.co`,
        invitedByUserAccountId: actor.admin.userAccountId,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
      select: { id: true, email: true },
    });
  }

  /** An accepted invitation for (club, trainer); optionally redacted after. */
  async function acceptedInvitation(clubId: string, userAccountId: string, redact = false) {
    const inv = await pendingInvitation(clubId, 24 * HOUR_MS);
    await prisma.clubTrainerInvitation.update({
      where: { id: inv.id },
      data: { status: 'ACCEPTED', acceptedByUserAccountId: userAccountId, respondedAt: new Date() },
      select: { id: true },
    });
    if (redact) {
      await prisma.clubTrainerInvitation.update({
        where: { id: inv.id },
        data: { email: `redacted:${inv.id}`, redactedAt: new Date() },
        select: { id: true },
      });
    }
    return inv;
  }

  beforeAll(async () => {
    const [admin, other] = await Promise.all(
      [0, 1].map(() =>
        prisma.userAccount.create({
          data: { supabaseUserId: randomUUID(), role: 'ADMIN', status: 'ACTIVE' },
          select: { id: true, supabaseUserId: true },
        }),
      ),
    );
    if (admin === undefined || other === undefined) throw new Error('admin fixtures missing');
    adminAccountIds = [admin.id, other.id];
    otherSupabaseUserId = other.supabaseUserId;
    const base = { log: { info: vi.fn(), warn }, jobs: noJobs };
    actor = { ...base, admin: { userAccountId: admin.id }, requestId: `req-ins-${marker}` };
    otherActor = { ...base, admin: { userAccountId: other.id }, requestId: `req-ins2-${marker}` };
  });

  afterAll(async () => {
    for (const id of clubIds) await cleanupTestClub(id);
    for (const trainer of trainers) await cleanupFixtureTrainer(trainer);
    await prisma.adminActionLog.deleteMany({
      where: { actorUserAccountId: { in: adminAccountIds } },
    });
    await prisma.userAccount.deleteMany({ where: { id: { in: adminAccountIds } } });
  });

  // ── getOverview (task 3.2) ────────────────────────────────────────────────

  describe('getOverview', () => {
    it('an active club with no trainer raises activeClubs and activeClubsWithoutTrainer', async () => {
      const before = await getOverview(prisma);
      await newClub('ciclismo');
      expect(delta(before, await getOverview(prisma))).toEqual({
        ...ZERO,
        activeClubs: 1,
        activeClubsWithoutTrainer: 1,
      });
    });

    it('a trainer assignment lowers clubs-without-trainer and raises activeTrainers; a revoked one does not count', async () => {
      const club = await newClub('patinaje');
      const before = await getOverview(prisma);
      const trainer = await newTrainer();
      const clubTrainerId = await addClubTrainer(club.id, trainer.userAccountId);
      expect(delta(before, await getOverview(prisma))).toEqual({
        ...ZERO,
        activeClubsWithoutTrainer: -1,
        activeTrainers: 1,
      });
      await revokeTrainer(prisma, actor, clubTrainerId);
      expect(delta(before, await getOverview(prisma))).toEqual(ZERO);
    });

    it('a deactivated club moves between the club counts; its non-revoked trainer stops counting', async () => {
      const club = await newClub('esgrima');
      const trainer = await newTrainer();
      await addClubTrainer(club.id, trainer.userAccountId);
      const before = await getOverview(prisma);
      await deactivateClub(prisma, actor, club.id);
      expect(delta(before, await getOverview(prisma))).toEqual({
        ...ZERO,
        activeClubs: -1,
        deactivatedClubs: 1,
        activeTrainers: -1,
      });
      await reactivateClub(prisma, actor, club.id);
      expect(delta(before, await getOverview(prisma))).toEqual(ZERO);
    });

    it('invitations at 1 h and 47 h are pending and expiring; 72 h pending only; expired neither', async () => {
      const club = await newClub('voleibol');
      const before = await getOverview(prisma);
      await pendingInvitation(club.id, 1 * HOUR_MS);
      await pendingInvitation(club.id, 47 * HOUR_MS);
      await pendingInvitation(club.id, 72 * HOUR_MS);
      await pendingInvitation(club.id, -1 * HOUR_MS);
      expect(delta(before, await getOverview(prisma))).toEqual({
        ...ZERO,
        pendingTrainerInvitations: 3,
        expiringTrainerInvitations: 2,
      });
    });

    it('generatedAt is within the request window, and the output has no athlete key', async () => {
      const start = Date.now();
      const overview = await getOverview(prisma);
      const end = Date.now();
      expect(overview.generatedAt.getTime()).toBeGreaterThanOrEqual(start);
      expect(overview.generatedAt.getTime()).toBeLessThanOrEqual(end);
      expect(Object.keys(overview).filter((k) => /athlete/i.test(k))).toEqual([]);
    });

    it('all counts come from one snapshot while a club toggles', async () => {
      const club = await newClub('remo');
      const first = await getOverview(prisma);
      const total = first.activeClubs + first.deactivatedClubs;
      const toggle = (async () => {
        for (let i = 0; i < 20; i += 1) {
          await prisma.club.update({
            where: { id: club.id },
            data: { deactivatedAt: i % 2 === 0 ? new Date() : null },
            select: { id: true },
          });
        }
      })();
      const reads = await Promise.all(Array.from({ length: 20 }, () => getOverview(prisma)));
      await toggle;
      for (const read of reads) expect(read.activeClubs + read.deactivatedClubs).toBe(total);
    });
  });

  // ── listTrainers (task 3.3) ───────────────────────────────────────────────

  describe('listTrainers', () => {
    const mine = <T extends { club: { id: string } }>(items: T[], ids: string[]) =>
      items.filter((i) => ids.includes(i.club.id));

    it('returns assignments from two clubs newest first, with invited emails', async () => {
      const [a, b] = [await newClub('tenis-a'), await newClub('tenis-b')];
      const [ta, tb] = [await newTrainer(), await newTrainer()];
      const idA = await addClubTrainer(a.id, ta.userAccountId);
      const inv = await acceptedInvitation(a.id, ta.userAccountId);
      const idB = await addClubTrainer(b.id, tb.userAccountId);
      await acceptedInvitation(b.id, tb.userAccountId, true);

      const page = await listTrainers(prisma, { take: 50, access: 'ALL', clubQuery: marker });
      const rows = mine(page.items, [a.id, b.id]);
      expect(rows.map((r) => r.id)).toEqual([idB, idA]);
      expect(rows[1]).toMatchObject({
        access: 'ACTIVE',
        invitedEmail: inv.email,
        club: { isActive: true },
      });
      // Redacted invitation: null email.
      expect(rows[0]?.invitedEmail).toBeNull();
      for (const row of rows) {
        expect(row).not.toHaveProperty('status');
        expect(row).not.toHaveProperty('userAccountId');
      }
    });

    it('derives ACTIVE, CLUB_DEACTIVATED and REVOKED and filters by each', async () => {
      const club = await newClub('karate');
      const [t1, t2] = [await newTrainer(), await newTrainer()];
      const live = await addClubTrainer(club.id, t1.userAccountId);
      const revoked = await addClubTrainer(club.id, t2.userAccountId);
      await revokeTrainer(prisma, actor, revoked);
      await deactivateClub(prisma, actor, club.id);

      const ids = async (access: 'ACTIVE' | 'CLUB_DEACTIVATED' | 'REVOKED' | 'ALL') =>
        mine((await listTrainers(prisma, { take: 50, access, clubQuery: marker })).items, [
          club.id,
        ]);

      const all = await ids('ALL');
      expect(all.find((r) => r.id === live)).toMatchObject({
        access: 'CLUB_DEACTIVATED',
        club: { isActive: false },
      });
      expect(all.find((r) => r.id === revoked)?.access).toBe('REVOKED');
      expect((await ids('ACTIVE')).map((r) => r.id)).toEqual([]);
      expect((await ids('CLUB_DEACTIVATED')).map((r) => r.id)).toEqual([live]);
      expect((await ids('REVOKED')).map((r) => r.id)).toEqual([revoked]);

      await reactivateClub(prisma, actor, club.id);
      expect((await ids('ACTIVE')).map((r) => r.id)).toEqual([live]);
      expect((await ids('REVOKED')).map((r) => r.id)).toEqual([revoked]);
    });

    it('matches clubQuery case-insensitively and paginates with take 1', async () => {
      const club = await newClub('Hockey');
      const [t1, t2] = [await newTrainer(), await newTrainer()];
      const older = await addClubTrainer(club.id, t1.userAccountId);
      const newer = await addClubTrainer(club.id, t2.userAccountId);
      const query = `HOCKEY ${marker.toUpperCase()}`;
      const first = await listTrainers(prisma, { take: 1, access: 'ALL', clubQuery: query });
      expect(first.items.map((r) => r.id)).toEqual([newer]);
      expect(first.nextCursor).toBe(newer);
      const second = await listTrainers(prisma, {
        take: 1,
        access: 'ALL',
        clubQuery: query,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items.map((r) => r.id)).toEqual([older]);
    });

    it('listClubTrainers still maps invited emails per club', async () => {
      const club = await newClub('golf');
      const trainer = await newTrainer();
      await addClubTrainer(club.id, trainer.userAccountId);
      const inv = await acceptedInvitation(club.id, trainer.userAccountId);
      const page = await listClubTrainers(prisma, { clubId: club.id, take: 20 });
      expect(page.items).toEqual([
        expect.objectContaining({ status: 'ACTIVE', invitedEmail: inv.email }),
      ]);
    });
  });

  // ── listActions (task 3.4) ────────────────────────────────────────────────

  describe('listActions', () => {
    let clubId: string;
    const lookups: string[] = [];
    let fakeResult: 'email' | 'null' = 'email';
    const fakeLookup: AdminEmailLookup = (supabaseUserId) => {
      lookups.push(supabaseUserId);
      return Promise.resolve(fakeResult === 'email' ? OTHER_ADMIN_EMAIL : null);
    };
    const caller = () => ({ ...actor, log: { warn } });

    beforeAll(async () => {
      const club = await newClub('natacion');
      clubId = club.id;
      await updateClub(prisma, actor, {
        clubId,
        name: `Liga de Natación ${marker}`,
        city: 'Duitama',
      });
      const invite = await inviteTrainer(prisma, actor, {
        clubId,
        email: `nat-${marker}@ligas.co`,
      });
      await revokeTrainerInvitation(prisma, actor, invite.id);
      const trainer = await newTrainer();
      const clubTrainerId = await addClubTrainer(clubId, trainer.userAccountId);
      await revokeTrainer(prisma, otherActor, clubTrainerId);
      await deactivateClub(prisma, actor, clubId);
    });

    it('returns exactly the club records newest first, trainer and invitation ones included', async () => {
      const page = await listActions(prisma, caller(), fakeLookup, { take: 50, clubId });
      expect(page.items.map((i) => i.action)).toEqual([
        'CLUB_DEACTIVATED',
        'TRAINER_REVOKED',
        'TRAINER_INVITATION_REVOKED',
        'TRAINER_INVITED',
        'CLUB_UPDATED',
        'CLUB_CREATED',
      ]);
      for (const item of page.items)
        expect(item.club).toEqual({ id: clubId, name: `Liga de Natación ${marker}` });
    });

    it('filters by action', async () => {
      const page = await listActions(prisma, caller(), fakeLookup, {
        take: 50,
        clubId,
        action: 'CLUB_UPDATED',
      });
      expect(page.items.map((i) => i.action)).toEqual(['CLUB_UPDATED']);
    });

    it('marks own rows as you without a lookup, and resolves the other admin', async () => {
      lookups.length = 0;
      fakeResult = 'email';
      const page = await listActions(prisma, caller(), fakeLookup, { take: 50, clubId });
      const other = page.items.find((i) => i.action === 'TRAINER_REVOKED');
      expect(other?.actor).toEqual({ isYou: false, email: OTHER_ADMIN_EMAIL });
      for (const item of page.items.filter((i) => i.action !== 'TRAINER_REVOKED')) {
        expect(item.actor).toEqual({ isYou: true, email: null });
      }
      expect(lookups).toEqual([otherSupabaseUserId]);

      fakeResult = 'null';
      const again = await listActions(prisma, caller(), fakeLookup, { take: 50, clubId });
      expect(again.items.find((i) => i.action === 'TRAINER_REVOKED')?.actor).toEqual({
        isYou: false,
        email: null,
      });
    });

    it('a directory that throws gives a null email and the page still loads', async () => {
      const failing = createCachedEmailLookup({
        getUserEmail: () => Promise.reject(new Error('down')),
      });
      const page = await listActions(prisma, caller(), failing, { take: 50, clubId });
      expect(page.items.find((i) => i.action === 'TRAINER_REVOKED')?.actor).toEqual({
        isYou: false,
        email: null,
      });
    });

    it('details carry changed fields and counts only, never ids', async () => {
      const page = await listActions(prisma, caller(), fakeLookup, { take: 50, clubId });
      const updated = page.items.find((i) => i.action === 'CLUB_UPDATED');
      expect(updated?.details).toEqual({ changedFields: ['name', 'city'] });
      const deactivated = page.items.find((i) => i.action === 'CLUB_DEACTIVATED');
      expect(deactivated?.details).toEqual({
        cancelledCertificationRequests: 0,
        rejectedMembershipInvitations: 0,
        revokedTrainerInvitations: 0,
      });
      const json = JSON.stringify(page);
      expect(json).not.toContain('requestId');
      expect(json).not.toContain(actor.requestId);
      expect(json).not.toContain(actor.admin.userAccountId);
      for (const item of page.items) expect(item.details).not.toHaveProperty('clubId');
    });

    it('paginates and creates no log row', async () => {
      const count = () => prisma.adminActionLog.count();
      const before = await count();
      const first = await listActions(prisma, caller(), fakeLookup, { take: 2, clubId });
      expect(first.items).toHaveLength(2);
      const second = await listActions(prisma, caller(), fakeLookup, {
        take: 50,
        clubId,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items.map((i) => i.action)).toHaveLength(4);
      expect(await count()).toBe(before);
    });
  });

  // ── listClubs query and withoutActiveTrainer (task 3.5) ───────────────────

  describe('listClubs search and trainer filter', () => {
    it('matches a name fragment and a slug fragment, combined with DEACTIVATED', async () => {
      const club = await newClub('Billar');
      await deactivateClub(prisma, actor, club.id);
      const byName = await listClubs(prisma, {
        take: 50,
        status: 'DEACTIVATED',
        query: `BILLAR ${marker}`,
      });
      expect(byName.items.map((c) => c.id)).toEqual([club.id]);
      const bySlug = await listClubs(prisma, {
        take: 50,
        status: 'DEACTIVATED',
        query: `BILLAR-${marker}`,
      });
      expect(bySlug.items.map((c) => c.id)).toEqual([club.id]);
      const active = await listClubs(prisma, {
        take: 50,
        status: 'ACTIVE',
        query: `billar ${marker}`,
      });
      expect(active.items).toEqual([]);
    });

    it('withoutActiveTrainer keeps no-trainer and revoked-only clubs, and agrees with the overview', async () => {
      const before = await getOverview(prisma);
      const none = await newClub('Squash none');
      const revokedOnly = await newClub('Squash revoked');
      const staffed = await newClub('Squash staffed');
      const [t1, t2] = [await newTrainer(), await newTrainer()];
      await revokeTrainer(prisma, actor, await addClubTrainer(revokedOnly.id, t1.userAccountId));
      await addClubTrainer(staffed.id, t2.userAccountId);

      const page = await listClubs(prisma, {
        take: 50,
        status: 'ACTIVE',
        withoutActiveTrainer: true,
        query: `squash`,
      });
      const ids = page.items
        .map((c) => c.id)
        .filter((id) => [none.id, revokedOnly.id, staffed.id].includes(id));
      expect(ids.sort()).toEqual([none.id, revokedOnly.id].sort());
      expect(delta(before, await getOverview(prisma)).activeClubsWithoutTrainer).toBe(ids.length);
    });
  });
});
