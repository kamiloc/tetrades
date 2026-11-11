/**
 * Trainer workspace reads (add-web-trainer-portal tasks 3.1–3.4) over real
 * HTTP with real Supabase JWTs: club.listMyTrainerClubs,
 * club.getRosterAthlete, club.findAthleteToInvite, and the roster's sport.
 *
 * Besides success / invalid input / 401 / 403 / 404, every trainer read is
 * checked for leaks of the athlete's memberships with other clubs, even
 * when the athlete's club-membership visibility is PUBLIC.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupFixtureAthletes,
  cleanupFixtureTrainer,
  cleanupTestClub,
  createAuthedUser,
  createFixtureAthlete,
  createFixtureTrainer,
  createTestClub,
  createTestMembership,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type FixtureAthlete,
  type FixtureTrainer,
  type TestServer,
} from './helpers/setup.js';

const UNKNOWN_ID = 'cunknownid000000000000000';

describe.skipIf(!authReady)('trainer workspace reads', () => {
  // Name marker so name searches only see this suite's athletes.
  const M = `tw${randomUUID().slice(0, 8)}`;

  let server: TestServer;
  let sportId: string;
  let sportName: string;

  // Clubs: A and A2 are trained by trainerA; B and C hold other memberships.
  let clubA: string;
  let clubA2: string;
  let clubB: string;
  let clubC: string;
  let clubRevoked: string;
  let clubDeactivated: string;
  const clubName = new Map<string, string>();

  let trainerA: AuthedUser;
  let trainerB: AuthedUser;
  let revokedTrainer: AuthedUser;
  let athleteUser: AuthedUser;
  let admin: AuthedUser;
  let trainerA2: FixtureTrainer;
  let trainerC: FixtureTrainer;

  let trainerARow: string;
  let trainerA2Row: string;
  let trainerBRow: string;
  let trainerCRow: string;

  // Searchable ACTIVE athletes, in name order.
  let ana: FixtureAthlete; // no membership
  let beto: FixtureAthlete; // ACTIVE in A (and ACTIVE in B, PUBLIC)
  let carla: FixtureAthlete; // pending in A, invited by trainerA
  let dora: FixtureAthlete; // pending in A, invited by trainerA2
  let elsa: FixtureAthlete; // ACTIVE in B, pending in C, PUBLIC
  // Excluded from name search.
  let fabio: FixtureAthlete; // ACTIVE, not searchable
  let gina: FixtureAthlete; // searchable, DRAFT
  let hugo: FixtureAthlete; // searchable, HIDDEN
  let ines: FixtureAthlete; // not searchable, LOCKED
  // Roster edge cases.
  let completed: FixtureAthlete;
  let rejected: FixtureAthlete;

  let fixtures: FixtureAthlete[] = [];

  const as = (user?: AuthedUser) => apiClient(server.url, user?.accessToken);

  const namedClub = async (label: string): Promise<string> => {
    const id = await createTestClub(label);
    const name = `Club ${label} ${M}`;
    await prisma.club.update({ where: { id }, data: { name }, select: { id: true } });
    clubName.set(id, name);
    return id;
  };

  const fixture = async (
    first: string,
    options: { isSearchable: boolean; status?: 'DRAFT' | 'HIDDEN' | 'LOCKED' },
  ): Promise<FixtureAthlete> => {
    const f = await createFixtureAthlete(sportId, {
      displayName: `${first} ${M}`,
      isSearchable: options.isSearchable,
    });
    if (options.status !== undefined) {
      await prisma.athlete.update({
        where: { id: f.athleteId },
        data: { profileStatus: options.status },
        select: { id: true },
      });
    }
    fixtures.push(f);
    return f;
  };

  /** Asserts the serialized response names no other club. */
  const expectNoClubs = (response: unknown, clubIds: string[]) => {
    const json = JSON.stringify(response);
    for (const id of clubIds) {
      expect(json).not.toContain(id);
      expect(json).not.toContain(clubName.get(id));
    }
  };

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000, sensitive: 100_000 });
    sportId = await createTestSport();
    sportName = (await prisma.sport.findUniqueOrThrow({ where: { id: sportId }, select: { name: true } })).name;

    [trainerA, trainerB, revokedTrainer, athleteUser, admin] = await Promise.all([
      createAuthedUser({ withAthlete: false, label: 'tw-ta' }),
      createAuthedUser({ withAthlete: false, label: 'tw-tb' }),
      createAuthedUser({ withAthlete: false, label: 'tw-rev' }),
      createAuthedUser({ sportId, label: 'tw-ath' }),
      createAuthedUser({ withAthlete: false, role: 'ADMIN', label: 'tw-adm' }),
    ]);
    trainerA2 = await createFixtureTrainer();
    trainerC = await createFixtureTrainer();

    clubA = await namedClub('tw-a');
    clubA2 = await namedClub('tw-a2');
    clubB = await namedClub('tw-b');
    clubC = await namedClub('tw-c');
    clubRevoked = await namedClub('tw-rev');
    clubDeactivated = await namedClub('tw-off');

    trainerARow = await addClubTrainer(clubA, trainerA.userAccountId);
    await addClubTrainer(clubA2, trainerA.userAccountId);
    const revokedRow = await addClubTrainer(clubRevoked, trainerA.userAccountId);
    await prisma.clubTrainer.update({ where: { id: revokedRow }, data: { revokedAt: new Date() }, select: { id: true } });
    await addClubTrainer(clubDeactivated, trainerA.userAccountId);
    await prisma.club.update({ where: { id: clubDeactivated }, data: { deactivatedAt: new Date() }, select: { id: true } });

    trainerA2Row = await addClubTrainer(clubA, trainerA2.userAccountId);
    trainerBRow = await addClubTrainer(clubB, trainerB.userAccountId);
    trainerCRow = await addClubTrainer(clubC, trainerC.userAccountId);
    const revokedTrainerRow = await addClubTrainer(clubA, revokedTrainer.userAccountId);
    await prisma.clubTrainer.update({
      where: { id: revokedTrainerRow },
      data: { revokedAt: new Date() },
      select: { id: true },
    });

    ana = await fixture('Ana', { isSearchable: true });
    beto = await fixture('Beto', { isSearchable: true });
    carla = await fixture('Carla', { isSearchable: true });
    dora = await fixture('Dora', { isSearchable: true });
    elsa = await fixture('Elsa', { isSearchable: true });
    fabio = await fixture('Fabio', { isSearchable: false });
    gina = await fixture('Gina', { isSearchable: true, status: 'DRAFT' });
    hugo = await fixture('Hugo', { isSearchable: true, status: 'HIDDEN' });
    ines = await fixture('Ines', { isSearchable: false, status: 'LOCKED' });
    completed = await fixture('Zoe', { isSearchable: false });
    rejected = await fixture('Yuri', { isSearchable: false });

    // A bio and measurements the lookup must never return.
    await prisma.athletePublicProfile.update({
      where: { athleteId: ana.athleteId },
      data: { publicBio: `Ciclista de ruta ${M}`, heightCm: 168, weightKg: 57.5 },
      select: { athleteId: true },
    });

    const member = (clubId: string, a: FixtureAthlete, clubTrainerId: string, status: 'ACTIVE' | 'PENDING_ATHLETE_CONFIRMATION' | 'COMPLETED' | 'REJECTED') =>
      createTestMembership({ clubId, athleteId: a.athleteId, clubTrainerId, status });
    await member(clubA, beto, trainerARow, 'ACTIVE');
    await member(clubB, beto, trainerBRow, 'ACTIVE');
    await member(clubA, carla, trainerARow, 'PENDING_ATHLETE_CONFIRMATION');
    await member(clubA, dora, trainerA2Row, 'PENDING_ATHLETE_CONFIRMATION');
    await member(clubB, elsa, trainerBRow, 'ACTIVE');
    await member(clubC, elsa, trainerCRow, 'PENDING_ATHLETE_CONFIRMATION');
    await member(clubA, completed, trainerARow, 'COMPLETED');
    await member(clubA, rejected, trainerARow, 'REJECTED');

    for (const a of [beto, elsa]) {
      await prisma.athleteVisibilitySettings.create({
        data: { athleteId: a.athleteId, clubMembershipsAudience: 'PUBLIC' },
        select: { athleteId: true },
      });
    }
  });

  // Bulk and parallel: one-row-at-a-time cleanup of this many fixtures
  // outlasts the hook timeout against the remote dev database.
  afterAll(async () => {
    // Clubs first: they hold the memberships, which reference the trainers.
    await Promise.all(
      [clubA, clubA2, clubB, clubC, clubRevoked, clubDeactivated].map((id) => cleanupTestClub(id)),
    );
    const athleteIds = fixtures.map((f) => f.athleteId);
    await prisma.athleteVisibilitySettings.deleteMany({ where: { athleteId: { in: athleteIds } } });
    await cleanupFixtureAthletes(fixtures);
    await Promise.all([trainerA2, trainerC].map((t) => cleanupFixtureTrainer(t)));
    await Promise.all(
      [trainerA, trainerB, revokedTrainer, athleteUser, admin].map((u) => cleanupAuthedUser(u)),
    );
    await deleteTestSport(sportId);
    await server.close();
    fixtures = [];
  }, 300_000);

  // ── club.listRoster: sport, no other clubs (task 3.1) ──────────────────────

  describe('club.listRoster', () => {
    it("carries each athlete's sport and never names another club", async () => {
      const page = await as(trainerA).club.listRoster.query({ clubId: clubA });
      const byAthlete = new Map(page.items.map((r) => [r.athlete.id, r]));
      expect([...byAthlete.keys()].sort()).toEqual([beto.athleteId, carla.athleteId].sort());
      for (const row of page.items) {
        expect(row.athlete.sport).toEqual({ id: sportId, name: sportName });
      }
      expectNoClubs(page, [clubB, clubC]);
    });
  });

  // ── club.listMyTrainerClubs (task 3.2) ───────────────────────────────────

  describe('club.listMyTrainerClubs', () => {
    it('returns both active clubs, by name, and skips revoked and deactivated assignments', async () => {
      const page = await as(trainerA).club.listMyTrainerClubs.query({});
      expect(page.items.map((i) => i.club.id)).toEqual([clubA, clubA2]);
      expect(page.nextCursor).toBeNull();
      expect(page.items[0]?.club).toEqual({
        id: clubA,
        slug: expect.any(String),
        name: clubName.get(clubA),
        countryCode: 'CO',
        city: 'Cali',
        isActive: true,
      });
    });

    it('pages by club id', async () => {
      const first = await as(trainerA).club.listMyTrainerClubs.query({ take: 1 });
      expect(first.items.map((i) => i.club.id)).toEqual([clubA]);
      expect(first.nextCursor).toBe(clubA);
      const second = await as(trainerA).club.listMyTrainerClubs.query({
        take: 1,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items.map((i) => i.club.id)).toEqual([clubA2]);
      expect(second.nextCursor).toBeNull();
    });

    it('returns an empty list to an athlete and to an admin', async () => {
      expect(await as(athleteUser).club.listMyTrainerClubs.query({})).toEqual({ items: [], nextCursor: null });
      expect(await as(admin).club.listMyTrainerClubs.query({})).toEqual({ items: [], nextCursor: null });
    });

    it('is UNAUTHORIZED signed out and rejects take 51', async () => {
      await expectTRPCCode(as().club.listMyTrainerClubs.query({}), 'UNAUTHORIZED');
      await expectTRPCCode(as(trainerA).club.listMyTrainerClubs.query({ take: 51 }), 'BAD_REQUEST');
    });

    it('contains no ClubTrainer id, user id or email', async () => {
      const json = JSON.stringify(await as(trainerA).club.listMyTrainerClubs.query({ take: 1 }));
      const rows = await prisma.clubTrainer.findMany({
        where: { userAccountId: trainerA.userAccountId },
        select: { id: true },
      });
      for (const { id } of rows) expect(json).not.toContain(id);
      expect(json).not.toContain(trainerA.userAccountId);
      expect(json).not.toContain(trainerA.supabaseUserId);
      expect(json).not.toContain(trainerA.email);
      expect(json).not.toMatch(/email/i);
    });
  });

  // ── club.getRosterAthlete (task 3.3) ─────────────────────────────────────

  describe('club.getRosterAthlete', () => {
    const get = (user: AuthedUser | undefined, athleteId: string, clubId = clubA) =>
      as(user).club.getRosterAthlete.query({ clubId, athleteId });

    it('returns an ACTIVE member and this trainer’s own pending invitee', async () => {
      const active = await get(trainerA, beto.athleteId);
      expect(active.status).toBe('ACTIVE');
      expect(active.athlete).toEqual({
        id: beto.athleteId,
        slug: beto.slug,
        displayName: `Beto ${M}`,
        sport: { id: sportId, name: sportName },
      });
      const pending = await get(trainerA, carla.athleteId);
      expect(pending.status).toBe('PENDING_ATHLETE_CONFIRMATION');
    });

    it('is NOT_FOUND for completed, rejected, never-member and another trainer’s pending invitee', async () => {
      for (const a of [completed, rejected, ana, dora]) {
        await expectTRPCCode(get(trainerA, a.athleteId), 'NOT_FOUND');
      }
      await expectTRPCCode(get(trainerA, UNKNOWN_ID), 'NOT_FOUND');
    });

    it('is FORBIDDEN for another club’s trainer and for a revoked trainer', async () => {
      await expectTRPCCode(get(trainerB, beto.athleteId), 'FORBIDDEN');
      await expectTRPCCode(get(revokedTrainer, beto.athleteId), 'FORBIDDEN');
    });

    it('is UNAUTHORIZED signed out and rejects a non-cuid id', async () => {
      await expectTRPCCode(get(undefined, beto.athleteId), 'UNAUTHORIZED');
      await expectTRPCCode(get(trainerA, 'not-a-cuid'), 'BAD_REQUEST');
    });

    it('never names the athlete’s other club', async () => {
      expectNoClubs(await get(trainerA, beto.athleteId), [clubB]);
    });
  });

  // ── club.findAthleteToInvite (task 3.4) ──────────────────────────────────

  describe('club.findAthleteToInvite', () => {
    const byName = (user: AuthedUser | undefined, query: string, extra: { take?: number; cursor?: string } = {}) =>
      as(user).club.findAthleteToInvite.query({ clubId: clubA, by: 'name', query, ...extra });
    const bySlug = (user: AuthedUser | undefined, slug: string) =>
      as(user).club.findAthleteToInvite.query({ clubId: clubA, by: 'slug', slug });

    it('by name: searchable ACTIVE athletes, case-insensitive, in name order, paginated', async () => {
      const names: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await byName(trainerA, M.toUpperCase(), { take: 2, ...(cursor ? { cursor } : {}) });
        names.push(...page.items.map((i) => i.athlete.displayName));
        cursor = page.nextCursor ?? undefined;
        pages += 1;
      } while (cursor !== undefined && pages < 10);
      expect(names).toEqual(['Ana', 'Beto', 'Carla', 'Dora', 'Elsa'].map((n) => `${n} ${M}`));
      expect(pages).toBe(3);
    });

    it('by name: excludes non-searchable and DRAFT, HIDDEN or LOCKED profiles', async () => {
      const page = await byName(trainerA, M, { take: 50 });
      const ids = page.items.map((i) => i.athlete.id);
      for (const a of [fabio, gina, hugo, ines]) expect(ids).not.toContain(a.athleteId);
    });

    it('by slug: returns a non-searchable ACTIVE athlete', async () => {
      const page = await bySlug(trainerA, fabio.slug);
      expect(page.items.map((i) => i.athlete.id)).toEqual([fabio.athleteId]);
      expect(page.nextCursor).toBeNull();
    });

    it('by slug: empty for an unknown slug and for DRAFT, HIDDEN or LOCKED profiles', async () => {
      for (const slug of [`no-such-${M}`, gina.slug, hugo.slug, ines.slug]) {
        expect(await bySlug(trainerA, slug)).toEqual({ items: [], nextCursor: null });
      }
    });

    it('relation: MEMBER, INVITED_BY_YOU, and null for another trainer’s invitee', async () => {
      const relation = async (a: FixtureAthlete) => (await bySlug(trainerA, a.slug)).items[0]?.relation;
      expect(await relation(beto)).toBe('MEMBER');
      expect(await relation(carla)).toBe('INVITED_BY_YOU');
      expect(await relation(dora)).toBeNull();
      expect(await relation(ana)).toBeNull();

      const page = await byName(trainerA, M, { take: 50 });
      const byId = new Map(page.items.map((i) => [i.athlete.id, i.relation]));
      expect(byId.get(beto.athleteId)).toBe('MEMBER');
      expect(byId.get(carla.athleteId)).toBe('INVITED_BY_YOU');
      expect(byId.get(dora.athleteId)).toBeNull();
    });

    it('inviting another trainer’s pending invitee answers CONFLICT', async () => {
      await expectTRPCCode(
        as(trainerA).club.inviteAthlete.mutate({ clubId: clubA, athleteId: dora.athleteId }),
        'CONFLICT',
      );
    });

    it('never names other clubs, by name or by slug, even with PUBLIC club visibility', async () => {
      const slugPage = await bySlug(trainerA, elsa.slug);
      expect(slugPage.items[0]?.relation).toBeNull();
      expectNoClubs(slugPage, [clubB, clubC]);

      const namePage = await byName(trainerA, `Elsa ${M}`);
      expect(namePage.items.map((i) => [i.athlete.id, i.relation])).toEqual([[elsa.athleteId, null]]);
      expectNoClubs(namePage, [clubB, clubC]);
    });

    it('returns only L0 identity and the relation', async () => {
      const page = await byName(trainerA, M, { take: 50 });
      for (const item of page.items) {
        expect(Object.keys(item).sort()).toEqual(['athlete', 'relation']);
        expect(Object.keys(item.athlete).sort()).toEqual(['displayName', 'id', 'slug', 'sport']);
      }
      const json = JSON.stringify(page);
      expect(json).not.toContain('Ciclista de ruta');
      expect(json).not.toMatch(/heightCm|weightKg|publicBio|email|exactDob|contactPhone|govId/i);
    });

    it('is FORBIDDEN for another club’s trainer, UNAUTHORIZED signed out, BAD_REQUEST for a 1-character query', async () => {
      await expectTRPCCode(byName(trainerB, M), 'FORBIDDEN');
      await expectTRPCCode(byName(undefined, M), 'UNAUTHORIZED');
      await expectTRPCCode(byName(trainerA, 'a'), 'BAD_REQUEST');
    });
  });
});
