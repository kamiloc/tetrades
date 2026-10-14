/**
 * Metrics service (task 4.3, sport-metrics + athlete-visibility specs) —
 * real DB, no mocks.
 *
 * Writes: ACTIVE accepted; PENDING, COMPLETED, REJECTED, other-club, and
 * non-trainer rejected with nothing stored; summary derivation (count,
 * latest-by-measuredAt, back-dated entries, personal best by direction).
 * Reads: owner, stranger, connection, active-club trainer, other-club
 * trainer, after-leaving, and the missing-settings default.
 */
import './helpers/load-env.js';

import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { requireClubTrainer } from '../../services/membership.js';
import { getSummaries, listDefinitions, listEntries, reportEntry } from '../../services/metrics.js';
import { resolveViewer, type Viewer } from '../../services/viewer.js';

import {
  addClubTrainer,
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

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describe.skipIf(!dbReady)('metrics service', () => {
  let sportId: string;
  let definitionId: string;
  let clubA: string;
  let clubB: string;
  let trainerA: FixtureAthlete;
  let trainerB: FixtureAthlete;
  let active: FixtureAthlete; // ACTIVE in club A
  let pending: FixtureAthlete;
  let completed: FixtureAthlete;
  let rejected: FixtureAthlete;
  let otherClub: FixtureAthlete; // ACTIVE in club B only
  let connection: FixtureAthlete; // ACCEPTED connection of `active`
  let stranger: FixtureAthlete;
  const v: Record<string, Viewer> = {};

  beforeAll(async () => {
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    const fx = () => createFixtureAthlete(sportId);
    [trainerA, trainerB, active, pending, completed, rejected, otherClub, connection, stranger] =
      await Promise.all([fx(), fx(), fx(), fx(), fx(), fx(), fx(), fx(), fx()]);
    clubA = await createTestClub('mt-a');
    clubB = await createTestClub('mt-b');
    const rowA = await addClubTrainer(clubA, trainerA.userAccountId);
    const rowB = await addClubTrainer(clubB, trainerB.userAccountId);
    const mk = (fx: FixtureAthlete, clubId: string, row: string, status: Parameters<typeof createTestMembership>[0]['status']) =>
      createTestMembership({ clubId, athleteId: fx.athleteId, clubTrainerId: row, status });
    await mk(active, clubA, rowA, 'ACTIVE');
    await mk(pending, clubA, rowA, 'PENDING_ATHLETE_CONFIRMATION');
    await mk(completed, clubA, rowA, 'COMPLETED');
    await mk(rejected, clubA, rowA, 'REJECTED');
    await mk(otherClub, clubB, rowB, 'ACTIVE');
    await prisma.athleteConnection.create({
      data: { requesterId: connection.athleteId, addresseeId: active.athleteId, status: 'ACCEPTED' },
      select: { id: true },
    });
    for (const [name, fx] of Object.entries({ trainerA, trainerB, active, connection, stranger })) {
      v[name] = await viewerOf(fx);
    }
  });

  afterAll(async () => {
    await cleanupTestClub(clubA);
    await cleanupTestClub(clubB);
    await deleteTestMetricDefinition(definitionId);
    for (const fx of [trainerA, trainerB, active, pending, completed, rejected, otherClub, connection, stranger]) {
      await cleanupFixtureAthlete(fx);
    }
    await deleteTestSport(sportId);
  });

  const viewer = (name: string): Viewer => {
    const found = v[name];
    if (found === undefined) throw new Error(`no viewer ${name}`);
    return found;
  };
  /** Mirrors trainerProcedure: resolve the caller's trainer row, then report. */
  const report = async (who: string, athleteId: string, clubId: string, value: number, measuredAt = new Date()) =>
    reportEntry(prisma, await requireClubTrainer(prisma, viewer(who), clubId), {
      athleteId,
      metricDefinitionId: definitionId,
      value,
      measuredAt,
    });
  const countFor = (athleteId: string) => prisma.athleteMetricEntry.count({ where: { athleteId } });

  describe('reportEntry', () => {
    it('stores an entry for an ACTIVE membership with trainer and membership recorded', async () => {
      const entry = await report('trainerA', active.athleteId, clubA, 45.5, daysAgo(2));
      expect(entry.value).toBe(45.5);
      expect(entry.clubId).toBe(clubA);
      const row = await prisma.athleteMetricEntry.findUniqueOrThrow({
        where: { id: entry.id },
        select: { clubMembership: { select: { status: true, clubId: true } }, reportedBy: { select: { userAccountId: true } } },
      });
      expect(row.clubMembership).toEqual({ status: 'ACTIVE', clubId: clubA });
      expect(row.reportedBy.userAccountId).toBe(trainerA.userAccountId);
    });

    for (const [label, fx] of [
      ['PENDING_ATHLETE_CONFIRMATION', () => pending],
      ['COMPLETED', () => completed],
      ['REJECTED', () => rejected],
    ] as const) {
      it(`is FORBIDDEN for a ${label} membership and stores nothing`, async () => {
        await expectCode(report('trainerA', fx().athleteId, clubA, 40), 'FORBIDDEN');
        expect(await countFor(fx().athleteId)).toBe(0);
      });
    }

    it("is FORBIDDEN for another club's athlete, with or without naming that club", async () => {
      await expectCode(report('trainerA', otherClub.athleteId, clubA, 40), 'FORBIDDEN');
      await expectCode(report('trainerA', otherClub.athleteId, clubB, 40), 'FORBIDDEN');
      expect(await countFor(otherClub.athleteId)).toBe(0);
    });

    it('is FORBIDDEN for a user who trains no club', async () => {
      await expectCode(report('stranger', active.athleteId, clubA, 40), 'FORBIDDEN');
    });

    it('rejects a measuredAt in the future', async () => {
      await expectCode(report('trainerA', active.athleteId, clubA, 40, daysAgo(-1)), 'BAD_REQUEST');
    });

    it('derives the summary: count increments, latest follows measuredAt, back-dated entries only count', async () => {
      // Starts from the 2-days-ago entry above.
      await report('trainerA', active.athleteId, clubA, 48.25, daysAgo(1));
      await report('trainerA', active.athleteId, clubA, 30, daysAgo(10)); // back-dated
      const summary = await prisma.athleteMetricSummary.findUniqueOrThrow({
        where: { athleteId_metricDefinitionId: { athleteId: active.athleteId, metricDefinitionId: definitionId } },
        select: { latestValue: true, entryCount: true, latestMeasuredAt: true },
      });
      expect(summary.entryCount).toBe(3);
      expect(summary.latestValue.toNumber()).toBe(48.25);
      expect(Math.abs(summary.latestMeasuredAt.getTime() - daysAgo(1).getTime())).toBeLessThan(60_000);
      expect(summary.entryCount).toBe(await countFor(active.athleteId));
    });
  });

  describe('personal best', () => {
    const defs: Record<'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'NEUTRAL', string> = {
      HIGHER_IS_BETTER: '',
      LOWER_IS_BETTER: '',
      NEUTRAL: '',
    };

    beforeAll(async () => {
      for (const direction of Object.keys(defs) as Array<keyof typeof defs>) {
        defs[direction] = await createTestMetricDefinition(direction);
      }
    });

    afterAll(async () => {
      for (const id of Object.values(defs)) await deleteTestMetricDefinition(id);
    });

    const reportTo = async (metricDefinitionId: string, value: number, measuredAt: Date) =>
      reportEntry(prisma, await requireClubTrainer(prisma, viewer('trainerA'), clubA), {
        athleteId: active.athleteId,
        metricDefinitionId,
        value,
        measuredAt,
      });
    const summaryOf = async (metricDefinitionId: string) => {
      const row = await prisma.athleteMetricSummary.findUniqueOrThrow({
        where: { athleteId_metricDefinitionId: { athleteId: active.athleteId, metricDefinitionId } },
        select: { latestValue: true, bestValue: true, bestMeasuredAt: true },
      });
      return {
        latest: row.latestValue.toNumber(),
        best: row.bestValue === null ? null : row.bestValue.toNumber(),
        bestMeasuredAt: row.bestMeasuredAt,
      };
    };

    it('HIGHER_IS_BETTER keeps the largest value while latest still moves', async () => {
      const id = defs.HIGHER_IS_BETTER;
      await reportTo(id, 40, daysAgo(5));
      await reportTo(id, 46, daysAgo(4));
      await reportTo(id, 42, daysAgo(3));
      expect(await summaryOf(id)).toMatchObject({ latest: 42, best: 46 });
    });

    it('LOWER_IS_BETTER keeps the smallest value while latest still moves', async () => {
      const id = defs.LOWER_IS_BETTER;
      await reportTo(id, 11.9, daysAgo(5));
      await reportTo(id, 11.4, daysAgo(4));
      await reportTo(id, 11.7, daysAgo(3));
      expect(await summaryOf(id)).toMatchObject({ latest: 11.7, best: 11.4 });
    });

    it('NEUTRAL tracks no best', async () => {
      const id = defs.NEUTRAL;
      await reportTo(id, 68.2, daysAgo(5));
      await reportTo(id, 67.5, daysAgo(4));
      expect(await summaryOf(id)).toEqual({ latest: 67.5, best: null, bestMeasuredAt: null });
    });

    it('a back-dated better entry sets the best but not the latest', async () => {
      const id = defs.HIGHER_IS_BETTER;
      await reportTo(id, 50, daysAgo(20));
      const summary = await summaryOf(id);
      expect(summary).toMatchObject({ latest: 42, best: 50 });
      expect(Math.abs((summary.bestMeasuredAt?.getTime() ?? 0) - daysAgo(20).getTime())).toBeLessThan(60_000);
    });

    it('a tie keeps the first recorded best', async () => {
      const id = defs.HIGHER_IS_BETTER;
      await reportTo(id, 50, daysAgo(1));
      const summary = await summaryOf(id);
      expect(summary.best).toBe(50);
      expect(Math.abs((summary.bestMeasuredAt?.getTime() ?? 0) - daysAgo(20).getTime())).toBeLessThan(60_000);
    });

    it('getSummaries returns the best fields', async () => {
      const rows = await getSummaries(prisma, viewer('active'), active.athleteId);
      const byId = new Map(rows.map((r) => [r.metricDefinitionId, r]));
      expect(byId.get(defs.LOWER_IS_BETTER)?.bestValue).toBe(11.4);
      expect(byId.get(defs.NEUTRAL)).toMatchObject({ bestValue: null, bestMeasuredAt: null });
    });

    it('listDefinitions returns the direction', async () => {
      await prisma.metricDefinition.update({
        where: { id: defs.LOWER_IS_BETTER },
        data: { sportId },
        select: { id: true },
      });
      const page = await listDefinitions(prisma, { sportId, take: 20 });
      expect(page.items.find((d) => d.id === defs.LOWER_IS_BETTER)?.direction).toBe('LOWER_IS_BETTER');
    });
  });

  describe('reads', () => {
    const setAudience = (athleteId: string, metricsAudience: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC') =>
      prisma.athleteVisibilitySettings.upsert({
        where: { athleteId },
        create: { athleteId, metricsAudience },
        update: { metricsAudience },
        select: { athleteId: true },
      });
    const list = (who: string | null) =>
      listEntries(prisma, who === null ? null : viewer(who), { athleteId: active.athleteId, take: 20 });
    const summaries = (who: string | null) =>
      getSummaries(prisma, who === null ? null : viewer(who), active.athleteId);

    it('treats a missing settings row as PRIVATE', async () => {
      await prisma.athleteVisibilitySettings.deleteMany({ where: { athleteId: active.athleteId } });
      expect((await list('stranger')).items).toHaveLength(0);
      expect(await summaries('stranger')).toHaveLength(0);
      expect((await list('connection')).items).toHaveLength(0);
      expect((await list('active')).items).toHaveLength(3);
    });

    it('always returns everything to the owner, even when PRIVATE', async () => {
      await setAudience(active.athleteId, 'PRIVATE');
      expect((await list('active')).items).toHaveLength(3);
      expect(await summaries('active')).toHaveLength(1);
    });

    it('returns club entries to the ACTIVE-club trainer even when PRIVATE, but not summaries', async () => {
      await setAudience(active.athleteId, 'PRIVATE');
      expect((await list('trainerA')).items).toHaveLength(3);
      expect(await summaries('trainerA')).toHaveLength(0);
      expect((await list('trainerB')).items).toHaveLength(0);
    });

    it('CONNECTIONS admits an accepted connection only', async () => {
      await setAudience(active.athleteId, 'CONNECTIONS');
      expect((await list('connection')).items).toHaveLength(3);
      expect(await summaries('connection')).toHaveLength(1);
      expect((await list('stranger')).items).toHaveLength(0);
      expect(await summaries('stranger')).toHaveLength(0);
      expect((await list(null)).items).toHaveLength(0);
    });

    it('PUBLIC admits strangers and anonymous callers', async () => {
      await setAudience(active.athleteId, 'PUBLIC');
      expect((await list('stranger')).items).toHaveLength(3);
      expect((await list(null)).items).toHaveLength(3);
      expect(await summaries(null)).toHaveLength(1);
    });

    it('paginates by cursor in measuredAt order', async () => {
      await setAudience(active.athleteId, 'PUBLIC');
      const first = await listEntries(prisma, null, { athleteId: active.athleteId, take: 2 });
      expect(first.items).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();
      const second = await listEntries(prisma, null, {
        athleteId: active.athleteId,
        take: 2,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
      const times = [...first.items, ...second.items].map((e) => e.measuredAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    });

    it("ends the club trainer's access once the athlete leaves", async () => {
      await setAudience(active.athleteId, 'PRIVATE');
      await prisma.clubMembership.updateMany({
        where: { clubId: clubA, athleteId: active.athleteId, status: 'ACTIVE' },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
      expect((await list('trainerA')).items).toHaveLength(0);
      expect((await list('active')).items).toHaveLength(3);
    });

    it('is NOT_FOUND for an unknown athlete', async () => {
      await expectCode(listEntries(prisma, null, { athleteId: 'cunknownathlete0000000000', take: 20 }), 'NOT_FOUND');
      await expectCode(getSummaries(prisma, null, 'cunknownathlete0000000000'), 'NOT_FOUND');
    });
  });
});
