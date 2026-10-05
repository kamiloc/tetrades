/**
 * Trainer-reported sport metrics (ADR-013, design D4).
 *
 * reportEntry runs in one transaction: resolve the caller's ClubTrainer row,
 * require an ACTIVE membership of the athlete with that club, insert the
 * entry, and derive the summary. The DB trigger
 * (supabase/constraints/athlete_metric_entry_active_membership.sql) repeats
 * the ACTIVE check for every writer. Entries are append-only: no update or
 * delete function exists.
 *
 * Reads go through the visibility service so list and detail agree.
 */
import type {
  AthleteMetricEntryOutput,
  AthleteMetricSummaryOutput,
  ListMetricDefinitionsInput,
  ListMetricEntriesInput,
  MetricDefinitionPublicOutput,
  ReportMetricEntryInput,
} from '@packages/validators';
import type { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { cursorArgs, toPage, type Page } from '../lib/pagination.js';

import type { ClubTrainerRef } from './membership.js';
import type { Viewer } from './viewer.js';
import {
  canView,
  loadAudienceSettings,
  metricEntryVisibilityWhere,
  resolveAudienceRelation,
} from './visibility.js';

/** Clock-skew allowance for measuredAt; anything later is a client error. */
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

const entrySelect = {
  id: true,
  metricDefinitionId: true,
  reportedByClubTrainerId: true,
  value: true,
  measuredAt: true,
  createdAt: true,
  clubMembership: { select: { clubId: true } },
} as const satisfies Prisma.AthleteMetricEntrySelect;

type EntryRow = Prisma.AthleteMetricEntryGetPayload<{ select: typeof entrySelect }>;

function toEntryOutput(row: EntryRow): AthleteMetricEntryOutput {
  return {
    id: row.id,
    metricDefinitionId: row.metricDefinitionId,
    reportedByClubTrainerId: row.reportedByClubTrainerId,
    value: row.value.toNumber(),
    measuredAt: row.measuredAt,
    createdAt: row.createdAt,
    clubId: row.clubMembership.clubId,
  };
}

/** Active catalog entries, ordered by name. */
export async function listDefinitions(
  prisma: PrismaClient,
  input: ListMetricDefinitionsInput,
): Promise<Page<MetricDefinitionPublicOutput>> {
  const rows = await prisma.metricDefinition.findMany({
    where: {
      isActive: true,
      ...(input.sportId === undefined ? {} : { sportId: input.sportId }),
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    ...cursorArgs(input),
    select: { id: true, key: true, name: true, unit: true, sportId: true },
  });
  return toPage(rows, input.take, (r) => r.id);
}

/** `trainer` comes from trainerProcedure and is already proven to be the caller's. */
export async function reportEntry(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: Omit<ReportMetricEntryInput, 'clubId'>,
): Promise<AthleteMetricEntryOutput> {
  if (input.measuredAt.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'measuredAt cannot be in the future' });
  }

  const definition = await prisma.metricDefinition.findUnique({
    where: { id: input.metricDefinitionId },
    select: { isActive: true },
  });
  if (definition === null || !definition.isActive) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Metric not found' });
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.clubMembership.findFirst({
      where: { clubId: trainer.clubId, athleteId: input.athleteId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (membership === null) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This athlete does not have an active membership with your club',
      });
    }

    const entry = await tx.athleteMetricEntry.create({
      data: {
        athleteId: input.athleteId,
        metricDefinitionId: input.metricDefinitionId,
        clubMembershipId: membership.id,
        reportedByClubTrainerId: trainer.id,
        value: input.value,
        measuredAt: input.measuredAt,
      },
      select: entrySelect,
    });

    const key = { athleteId: input.athleteId, metricDefinitionId: input.metricDefinitionId };
    // Native ON CONFLICT upsert: concurrent first entries cannot both insert.
    await tx.athleteMetricSummary.upsert({
      where: { athleteId_metricDefinitionId: key },
      create: {
        ...key,
        latestValue: input.value,
        latestMeasuredAt: input.measuredAt,
        entryCount: 1,
      },
      update: { entryCount: { increment: 1 } },
      select: { athleteId: true },
    });
    // "Latest" is by measuredAt, so a back-dated entry only bumps the count.
    // The predicate is re-checked under the row lock, so this stays correct
    // when two entries for the same metric land concurrently.
    await tx.athleteMetricSummary.updateMany({
      where: { ...key, latestMeasuredAt: { lte: input.measuredAt } },
      data: { latestValue: input.value, latestMeasuredAt: input.measuredAt },
    });

    return toEntryOutput(entry);
  });
}

async function requireAthlete(prisma: PrismaClient, athleteId: string): Promise<void> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true },
  });
  if (athlete === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
  }
}

/** Entries the viewer may see; an empty page when none are visible. */
export async function listEntries(
  prisma: PrismaClient,
  viewer: Viewer | null,
  input: ListMetricEntriesInput,
): Promise<Page<AthleteMetricEntryOutput>> {
  await requireAthlete(prisma, input.athleteId);
  const rows = await prisma.athleteMetricEntry.findMany({
    where: {
      athleteId: input.athleteId,
      ...(input.metricDefinitionId === undefined
        ? {}
        : { metricDefinitionId: input.metricDefinitionId }),
      AND: [metricEntryVisibilityWhere(viewer)],
    },
    orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: entrySelect,
  });
  return toPage(rows.map(toEntryOutput), input.take, (e) => e.id);
}

/**
 * Summaries aggregate entries from every club, so only the audience rule
 * applies (no active-club trainer exception). Empty when not visible.
 */
export async function getSummaries(
  prisma: PrismaClient,
  viewer: Viewer | null,
  athleteId: string,
): Promise<AthleteMetricSummaryOutput[]> {
  await requireAthlete(prisma, athleteId);
  const [relation, settings] = await Promise.all([
    resolveAudienceRelation(prisma, viewer, athleteId),
    loadAudienceSettings(prisma, athleteId),
  ]);
  if (!canView('metrics', relation, settings)) return [];

  const rows = await prisma.athleteMetricSummary.findMany({
    where: { athleteId },
    orderBy: { metricDefinitionId: 'asc' },
    select: {
      metricDefinitionId: true,
      latestValue: true,
      latestMeasuredAt: true,
      entryCount: true,
    },
  });
  return rows.map((r) => ({ ...r, latestValue: r.latestValue.toNumber() }));
}
