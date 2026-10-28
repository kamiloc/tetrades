/**
 * Dev-only fixture 1/4: club memberships for one signed-up athlete.
 *
 * Creates (against seeded clubs, each with a seeded trainer):
 *   - 2 ACTIVE memberships (the Clubs history, the certification club picker,
 *     and the club that the performance fixture reports metrics from);
 *   - 2 pending invitations (Clubs tab badge "2", Accept/Decline);
 *   - 1 COMPLETED membership (ended history row);
 *   - 1 REJECTED invitation (must NOT appear anywhere in the app).
 *
 *   yarn db:fixture:clubs [--athlete <slug>]
 *
 * Idempotent: a club where the athlete already has any membership is skipped.
 * Memberships are never deleted (metric entries and certification requests
 * reference them), so there is no --replace.
 */

import { ClubMembershipStatus } from '@prisma/client';

import {
  MEMBERSHIP_STARTED_DAYS_AGO,
  PRIMARY_CLUB_SLUG,
  daysAgo,
  parseFixtureArgs,
  prisma,
  resolveAthlete,
  runFixture,
} from './shared.js';

type Plan =
  | { clubSlug: string; status: 'ACTIVE'; invitedDaysAgo: number; respondedDaysAgo: number }
  | { clubSlug: string; status: 'PENDING_ATHLETE_CONFIRMATION'; invitedDaysAgo: number }
  | { clubSlug: string; status: 'COMPLETED'; invitedDaysAgo: number; respondedDaysAgo: number; endedDaysAgo: number }
  | { clubSlug: string; status: 'REJECTED'; invitedDaysAgo: number; respondedDaysAgo: number };

const PLANS: readonly Plan[] = [
  {
    clubSlug: PRIMARY_CLUB_SLUG,
    status: 'ACTIVE',
    invitedDaysAgo: MEMBERSHIP_STARTED_DAYS_AGO + 2,
    respondedDaysAgo: MEMBERSHIP_STARTED_DAYS_AGO,
  },
  { clubSlug: 'liga-natacion-valle', status: 'ACTIVE', invitedDaysAgo: 120, respondedDaysAgo: 118 },
  { clubSlug: 'liga-voleibol-valle', status: 'PENDING_ATHLETE_CONFIRMATION', invitedDaysAgo: 3 },
  { clubSlug: 'liga-baloncesto-santander', status: 'PENDING_ATHLETE_CONFIRMATION', invitedDaysAgo: 1 },
  {
    clubSlug: 'liga-futbol-salon-bogota',
    status: 'COMPLETED',
    invitedDaysAgo: 760,
    respondedDaysAgo: 755,
    endedDaysAgo: 420,
  },
  { clubSlug: 'liga-tejo-boyaca', status: 'REJECTED', invitedDaysAgo: 60, respondedDaysAgo: 58 },
];

async function main(): Promise<void> {
  const { athleteSlug } = parseFixtureArgs(process.argv.slice(2));
  const athlete = await resolveAthlete(athleteSlug);
  const now = new Date();

  for (const plan of PLANS) {
    const club = await prisma.club.findUnique({
      where: { slug: plan.clubSlug },
      select: { id: true, name: true, trainers: { select: { id: true }, take: 1 } },
    });
    const trainer = club?.trainers[0];
    if (!club || !trainer) throw new Error(`Club "${plan.clubSlug}" not found or has no trainer. Run yarn db:seed first.`);

    const existing = await prisma.clubMembership.findFirst({
      where: { athleteId: athlete.id, clubId: club.id },
      select: { status: true },
    });
    if (existing) {
      console.log(`  skip ${club.name}: already ${existing.status}`);
      continue;
    }

    // The transition trigger only accepts PENDING_ATHLETE_CONFIRMATION on insert.
    const membership = await prisma.clubMembership.create({
      data: {
        clubId: club.id,
        athleteId: athlete.id,
        invitedByClubTrainerId: trainer.id,
        createdAt: daysAgo(now, plan.invitedDaysAgo, 15),
      },
      select: { id: true },
    });

    if (plan.status !== ClubMembershipStatus.PENDING_ATHLETE_CONFIRMATION) {
      await prisma.clubMembership.update({
        where: { id: membership.id },
        data: {
          status: plan.status === 'REJECTED' ? ClubMembershipStatus.REJECTED : ClubMembershipStatus.ACTIVE,
          respondedAt: daysAgo(now, plan.respondedDaysAgo, 15),
        },
        select: { id: true },
      });
    }
    if (plan.status === 'COMPLETED') {
      await prisma.clubMembership.update({
        where: { id: membership.id },
        data: { status: ClubMembershipStatus.COMPLETED, endedAt: daysAgo(now, plan.endedDaysAgo, 15) },
        select: { id: true },
      });
    }
    console.log(`  ${plan.status.padEnd(28)} ${club.name}`);
  }
  console.log(`Clubs fixture ready for ${athlete.slug}.`);
}

runFixture('clubs fixture', main);
