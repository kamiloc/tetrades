/**
 * Dev-only fixture 4/4: achievements and certification requests for one
 * signed-up athlete. Run the clubs fixture first: requests go to the athlete's
 * ACTIVE memberships.
 *
 * Creates one achievement per certification state (ADR-016):
 *   - UNVERIFIED, never submitted (Request certification);
 *   - UNVERIFIED with a CANCELLED request (withdrawn; request again);
 *   - PENDING at the primary club (Withdraw);
 *   - VERIFIED, approved by the primary club's trainer (no action);
 *   - REJECTED with a reason by the second active club (Request again).
 * The achievement's status is the summary of its latest request, as the
 * certification service keeps it.
 *
 *   yarn db:fixture:achievements [--athlete <slug>] [--replace]
 *
 * Idempotent: an achievement with the same title is skipped. --replace deletes
 * this fixture's achievements first (their requests cascade).
 */

import { VerificationStatus } from '@prisma/client';

import { PRIMARY_CLUB_SLUG, daysAgo, parseFixtureArgs, prisma, resolveAthlete, runFixture } from './shared.js';

type RequestPlan =
  | { outcome: 'PENDING'; club: 'primary' | 'secondary'; requestedDaysAgo: number }
  | { outcome: 'CANCELLED'; club: 'primary' | 'secondary'; requestedDaysAgo: number }
  | { outcome: 'APPROVED'; club: 'primary' | 'secondary'; requestedDaysAgo: number; decidedDaysAgo: number }
  | {
      outcome: 'REJECTED';
      club: 'primary' | 'secondary';
      requestedDaysAgo: number;
      decidedDaysAgo: number;
      reason: string;
    };

interface Plan {
  title: string;
  organization: string;
  achievedDaysAgo: number;
  request: RequestPlan | null;
}

const SUMMARY: Record<RequestPlan['outcome'], VerificationStatus> = {
  PENDING: VerificationStatus.PENDING,
  CANCELLED: VerificationStatus.UNVERIFIED,
  APPROVED: VerificationStatus.VERIFIED,
  REJECTED: VerificationStatus.REJECTED,
};

const PLANS: readonly Plan[] = [
  {
    title: 'Top 20 sub-23 — Media Maratón de Barranquilla',
    organization: 'Corporación Media Maratón de Barranquilla',
    achievedDaysAgo: 150,
    request: null,
  },
  {
    title: 'Clasificación a Juegos Nacionales 2027 — 400 m',
    organization: 'Federación Colombiana de Atletismo',
    achievedDaysAgo: 75,
    request: { outcome: 'CANCELLED', club: 'primary', requestedDaysAgo: 60 },
  },
  {
    title: 'Campeón departamental 400 m — Juegos Departamentales del Atlántico',
    organization: 'Indeportes Atlántico',
    achievedDaysAgo: 40,
    request: { outcome: 'PENDING', club: 'primary', requestedDaysAgo: 6 },
  },
  {
    title: 'Medalla de plata 4×400 m — Campeonato Nacional Sub-23',
    organization: 'Federación Colombiana de Atletismo',
    achievedDaysAgo: 260,
    request: { outcome: 'APPROVED', club: 'primary', requestedDaysAgo: 240, decidedDaysAgo: 236 },
  },
  {
    title: 'Marca personal 50 m libre — 26,1 s',
    organization: 'Liga de Natación del Valle',
    achievedDaysAgo: 100,
    request: {
      outcome: 'REJECTED',
      club: 'secondary',
      requestedDaysAgo: 90,
      decidedDaysAgo: 85,
      reason: 'La planilla oficial del torneo registra 26,81 s. Adjunta el acta de la competencia y vuelve a enviarla.',
    },
  },
];

async function main(): Promise<void> {
  const { athleteSlug, replace } = parseFixtureArgs(process.argv.slice(2));
  const athlete = await resolveAthlete(athleteSlug);
  const now = new Date();

  const active = await prisma.clubMembership.findMany({
    where: { athleteId: athlete.id, status: 'ACTIVE' },
    select: { id: true, club: { select: { id: true, slug: true, name: true, trainers: { select: { id: true }, take: 1 } } } },
    orderBy: { respondedAt: 'asc' },
  });
  const primary = active.find((m) => m.club.slug === PRIMARY_CLUB_SLUG) ?? active[0];
  const secondary = active.find((m) => m.id !== primary?.id) ?? primary;
  if (!primary || !secondary) throw new Error('No ACTIVE club membership. Run yarn db:fixture:clubs first.');

  if (replace) {
    const removed = await prisma.athleteAchievement.deleteMany({
      where: { athleteId: athlete.id, title: { in: PLANS.map((p) => p.title) } },
    });
    console.log(`  removed ${removed.count} fixture achievements`);
  }

  for (const plan of PLANS) {
    const existing = await prisma.athleteAchievement.findFirst({
      where: { athleteId: athlete.id, title: plan.title },
      select: { verificationStatus: true },
    });
    if (existing) {
      console.log(`  skip "${plan.title}": already ${existing.verificationStatus}`);
      continue;
    }

    const request = plan.request;
    const membership = request?.club === 'secondary' ? secondary : primary;
    const trainer = membership.club.trainers[0];
    if (!trainer) throw new Error(`${membership.club.name} has no trainer. Run yarn db:seed first.`);

    await prisma.$transaction(async (tx) => {
      // Owner-role inserts may carry the summarized status directly (the
      // integrity trigger only restricts anon/authenticated callers).
      const achievement = await tx.athleteAchievement.create({
        data: {
          athleteId: athlete.id,
          title: plan.title,
          organization: plan.organization,
          achievedOn: daysAgo(now, plan.achievedDaysAgo, 0),
          verificationStatus: request ? SUMMARY[request.outcome] : VerificationStatus.UNVERIFIED,
          createdAt: daysAgo(now, plan.achievedDaysAgo - 1),
        },
        select: { id: true },
      });
      if (!request) return;

      // The transitions trigger only accepts PENDING with no decision on insert.
      const created = await tx.achievementCertificationRequest.create({
        data: {
          achievementId: achievement.id,
          clubId: membership.club.id,
          clubMembershipId: membership.id,
          requestedAt: daysAgo(now, request.requestedDaysAgo, 16),
        },
        select: { id: true },
      });
      if (request.outcome === 'PENDING') return;
      if (request.outcome === 'CANCELLED') {
        await tx.achievementCertificationRequest.update({
          where: { id: created.id },
          data: { status: 'CANCELLED' },
          select: { id: true },
        });
        return;
      }
      await tx.achievementCertificationRequest.update({
        where: { id: created.id },
        data: {
          status: request.outcome,
          decidedByClubTrainerId: trainer.id,
          decidedAt: daysAgo(now, request.decidedDaysAgo, 18),
          rejectionReason: request.outcome === 'REJECTED' ? request.reason : null,
        },
        select: { id: true },
      });
    });
    const label = request ? `${SUMMARY[request.outcome]} (${request.outcome} at ${membership.club.name})` : 'UNVERIFIED';
    console.log(`  ${label.padEnd(60)} ${plan.title}`);
  }
  console.log(`Achievements fixture ready for ${athlete.slug}.`);
}

runFixture('achievements fixture', main);
