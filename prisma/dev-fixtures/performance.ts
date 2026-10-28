/**
 * Dev-only fixture 2/4: gives one real (non-seed) athlete trainer-reported metric
 * data, so the mobile Performance tab can be checked on a device.
 *
 * Seed athletes have placeholder Supabase ids and can't sign in, and the app
 * has no trainer screens yet, so a signed-in athlete otherwise has no metrics.
 *
 * What it creates for the chosen athlete:
 *   - an ACTIVE membership at a seeded club (default: Liga de Atletismo del
 *     Atlántico), started ~11 months ago and attributed to that club's trainer;
 *   - VO₂ máx: 1 entry (single-point chart; empty in the 1M range);
 *   - Salto vertical: 4 entries (a short series);
 *   - Sprint 30 m: 70 entries in the last ~3 months (3M range needs a 2nd page);
 *   - Frecuencia cardiaca en reposo: 300 daily entries (all-time cap of 200);
 *   - summaries recomputed from all of the athlete's entries for those metrics.
 *
 * Usage (run from the repo root, against a dev database only):
 *   yarn db:fixture:performance                    # the only non-seed athlete
 *   yarn db:fixture:performance --athlete <slug>   # a specific athlete
 *   yarn db:fixture:performance --athlete <slug> --replace
 *
 * --replace deletes this athlete's entries for the four metrics first.
 * Entries are append-only (no UPDATE), so re-running without it is refused.
 * Never run against production. console output is allowed here (dev utility).
 */

import { ClubMembershipStatus, MetricDirection } from '@prisma/client';

import {
  MEMBERSHIP_STARTED_DAYS_AGO,
  PRIMARY_CLUB_SLUG,
  daysAgo,
  parseFixtureArgs,
  prisma,
  resolveAthlete,
  runFixture,
} from './shared.js';

interface SeriesPlan {
  metricKey: string;
  count: number;
  // Days back from today for the oldest and newest entry.
  fromDaysAgo: number;
  toDaysAgo: number;
  // Value for entry i of count (oldest first). Deterministic, no randomness.
  value: (i: number, count: number) => number;
}

// Small deterministic wobble so lines don't look synthetic.
const wobble = (i: number, amplitude: number): number => Math.sin(i * 1.7) * amplitude;
const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

const PLANS: readonly SeriesPlan[] = [
  { metricKey: 'vo2max', count: 1, fromDaysAgo: 45, toDaysAgo: 45, value: () => 52.4 },
  {
    metricKey: 'vertical_jump',
    count: 4,
    fromDaysAgo: 200,
    toDaysAgo: 20,
    value: (i) => round(48 + i * 1.5 + wobble(i, 0.6), 1),
  },
  {
    // Improving (lower is better) over ~85 days of training sessions.
    metricKey: 'sprint_30m',
    count: 70,
    fromDaysAgo: 85,
    toDaysAgo: 1,
    value: (i, n) => round(4.42 - (i / (n - 1)) * 0.18 + wobble(i, 0.03), 2),
  },
  {
    // Daily morning reading, drifting down as fitness improves.
    metricKey: 'resting_heart_rate',
    count: 300,
    fromDaysAgo: 300,
    toDaysAgo: 1,
    value: (i, n) => Math.round(62 - (i / (n - 1)) * 6 + wobble(i, 2)),
  },
];

// Spread `count` dates evenly between two "days ago" marks, 14:00 UTC
// (morning sessions in Colombia, UTC-5), oldest first.
function datesFor(plan: SeriesPlan, now: Date): Date[] {
  if (plan.count === 1) return [daysAgo(now, plan.fromDaysAgo)];
  const span = plan.fromDaysAgo - plan.toDaysAgo;
  return Array.from({ length: plan.count }, (_, i) =>
    daysAgo(now, plan.fromDaysAgo - Math.round((i * span) / (plan.count - 1))),
  );
}

async function main(): Promise<void> {
  const { athleteSlug, replace, extra } = parseFixtureArgs(process.argv.slice(2));
  const clubSlug = extra.get('club') ?? PRIMARY_CLUB_SLUG;
  const now = new Date();

  const athlete = await resolveAthlete(athleteSlug);
  const club = await prisma.club.findUnique({
    where: { slug: clubSlug },
    select: { id: true, name: true, trainers: { select: { id: true }, take: 1 } },
  });
  const trainer = club?.trainers[0];
  if (!club || !trainer) throw new Error(`Club "${clubSlug}" not found or has no trainer. Run yarn db:seed first.`);

  const definitions = await prisma.metricDefinition.findMany({
    where: { key: { in: PLANS.map((p) => p.metricKey) } },
    select: { id: true, key: true, direction: true },
  });
  const byKey = new Map(definitions.map((d) => [d.key, d]));
  for (const plan of PLANS) {
    if (!byKey.has(plan.metricKey)) throw new Error(`Metric "${plan.metricKey}" not found. Run yarn db:seed first.`);
  }
  const metricIds = definitions.map((d) => d.id);

  const existing = await prisma.athleteMetricEntry.count({
    where: { athleteId: athlete.id, metricDefinitionId: { in: metricIds } },
  });
  if (existing > 0 && !replace) {
    throw new Error(`${athlete.slug} already has ${existing} entries for these metrics. Re-run with --replace.`);
  }

  // Membership: reuse an ACTIVE one at this club, otherwise invite then accept
  // (the transition trigger only accepts PENDING_ATHLETE_CONFIRMATION on insert).
  const startedAt = daysAgo(now, MEMBERSHIP_STARTED_DAYS_AGO, 15);
  const open = await prisma.clubMembership.findFirst({
    where: {
      athleteId: athlete.id,
      clubId: club.id,
      status: { in: [ClubMembershipStatus.ACTIVE, ClubMembershipStatus.PENDING_ATHLETE_CONFIRMATION] },
    },
    select: { id: true, status: true },
  });
  let membershipId: string;
  if (open?.status === ClubMembershipStatus.ACTIVE) {
    membershipId = open.id;
  } else if (open) {
    // A pending invitation already exists: accept it now.
    await prisma.clubMembership.update({
      where: { id: open.id },
      data: { status: ClubMembershipStatus.ACTIVE, respondedAt: now },
      select: { id: true },
    });
    membershipId = open.id;
  } else {
    const created = await prisma.clubMembership.create({
      data: { clubId: club.id, athleteId: athlete.id, invitedByClubTrainerId: trainer.id, createdAt: startedAt },
      select: { id: true },
    });
    await prisma.clubMembership.update({
      where: { id: created.id },
      data: { status: ClubMembershipStatus.ACTIVE, respondedAt: startedAt },
      select: { id: true },
    });
    membershipId = created.id;
  }

  await prisma.$transaction(async (tx) => {
    if (replace) {
      await tx.athleteMetricEntry.deleteMany({ where: { athleteId: athlete.id, metricDefinitionId: { in: metricIds } } });
    }
    for (const plan of PLANS) {
      const definition = byKey.get(plan.metricKey);
      if (!definition) continue;
      const dates = datesFor(plan, now);
      await tx.athleteMetricEntry.createMany({
        data: dates.map((measuredAt, i) => ({
          athleteId: athlete.id,
          metricDefinitionId: definition.id,
          clubMembershipId: membershipId,
          reportedByClubTrainerId: trainer.id,
          value: plan.value(i, plan.count),
          measuredAt,
          createdAt: measuredAt,
        })),
      });
    }

    // Summaries derived from every entry, the same way reportEntry does.
    for (const definition of definitions) {
      const entries = await tx.athleteMetricEntry.findMany({
        where: { athleteId: athlete.id, metricDefinitionId: definition.id },
        select: { value: true, measuredAt: true },
        orderBy: [{ measuredAt: 'asc' }, { id: 'asc' }],
      });
      const latest = entries[entries.length - 1];
      if (!latest) {
        await tx.athleteMetricSummary.deleteMany({ where: { athleteId: athlete.id, metricDefinitionId: definition.id } });
        continue;
      }
      let best: { value: number; measuredAt: Date } | null = null;
      if (definition.direction !== MetricDirection.NEUTRAL) {
        for (const e of entries) {
          const v = Number(e.value);
          const better =
            best === null ||
            (definition.direction === MetricDirection.HIGHER_IS_BETTER ? v > best.value : v < best.value);
          if (better) best = { value: v, measuredAt: e.measuredAt };
        }
      }
      const summary = {
        latestValue: latest.value,
        latestMeasuredAt: latest.measuredAt,
        entryCount: entries.length,
        bestValue: best?.value ?? null,
        bestMeasuredAt: best?.measuredAt ?? null,
      };
      await tx.athleteMetricSummary.upsert({
        where: { athleteId_metricDefinitionId: { athleteId: athlete.id, metricDefinitionId: definition.id } },
        create: { athleteId: athlete.id, metricDefinitionId: definition.id, ...summary },
        update: summary,
        select: { athleteId: true },
      });
    }
  }, { timeout: 60_000 });

  console.log(`Fixture ready for ${athlete.slug} at ${club.name}:`);
  for (const plan of PLANS) console.log(`  ${plan.metricKey}: ${plan.count} entries`);
}

runFixture('performance fixture', main);
