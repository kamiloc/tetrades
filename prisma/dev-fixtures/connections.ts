/**
 * Dev-only fixture 3/4: connections for one signed-up athlete, with seeded
 * athletes on the other side.
 *
 * Creates one of each state (the schema has no REJECTED connection state;
 * a rejected request is DECLINED):
 *   - ACCEPTED ×3: two requested by the athlete, one by the other side;
 *   - PENDING ×2: one incoming (waiting on the athlete), one outgoing;
 *   - DECLINED ×1: the athlete's request that the other side declined.
 * Each ACCEPTED connection increments connectionCountCache on both athletes,
 * as connection.acceptRequest does, so Profile and Connections show the count.
 *
 *   yarn db:fixture:connections [--athlete <slug>]
 *
 * Idempotent: a pair already connected in either direction is skipped.
 */

import { ConnectionStatus } from '@prisma/client';

import { daysAgo, parseFixtureArgs, prisma, resolveAthlete, runFixture } from './shared.js';

interface Plan {
  otherSlug: string;
  // 'out' = the fixture athlete sent the request; 'in' = the other athlete did.
  direction: 'out' | 'in';
  status: ConnectionStatus;
  requestedDaysAgo: number;
  respondedDaysAgo: number | null;
}

const PLANS: readonly Plan[] = [
  { otherSlug: 'daniel-mendoza-restrepo', direction: 'out', status: ConnectionStatus.ACCEPTED, requestedDaysAgo: 200, respondedDaysAgo: 199 },
  { otherSlug: 'juan-esteban-moreno-patino', direction: 'in', status: ConnectionStatus.ACCEPTED, requestedDaysAgo: 140, respondedDaysAgo: 138 },
  { otherSlug: 'valentina-hernandez-lozano', direction: 'out', status: ConnectionStatus.ACCEPTED, requestedDaysAgo: 60, respondedDaysAgo: 59 },
  { otherSlug: 'laura-sofia-gomez-ospina', direction: 'in', status: ConnectionStatus.PENDING, requestedDaysAgo: 2, respondedDaysAgo: null },
  { otherSlug: 'maria-jose-benavides-ortiz', direction: 'out', status: ConnectionStatus.PENDING, requestedDaysAgo: 5, respondedDaysAgo: null },
  { otherSlug: 'kevin-andres-palacios-mosquera', direction: 'out', status: ConnectionStatus.DECLINED, requestedDaysAgo: 30, respondedDaysAgo: 28 },
];

async function main(): Promise<void> {
  const { athleteSlug } = parseFixtureArgs(process.argv.slice(2));
  const athlete = await resolveAthlete(athleteSlug);
  const now = new Date();

  for (const plan of PLANS) {
    const other = await prisma.athlete.findUnique({
      where: { slug: plan.otherSlug },
      select: { id: true, displayName: true },
    });
    if (!other) throw new Error(`Seed athlete "${plan.otherSlug}" not found. Run yarn db:seed first.`);
    if (other.id === athlete.id) continue;

    const existing = await prisma.athleteConnection.findFirst({
      where: {
        OR: [
          { requesterId: athlete.id, addresseeId: other.id },
          { requesterId: other.id, addresseeId: athlete.id },
        ],
      },
      select: { status: true },
    });
    if (existing) {
      console.log(`  skip ${other.displayName}: already ${existing.status}`);
      continue;
    }

    const requesterId = plan.direction === 'out' ? athlete.id : other.id;
    const addresseeId = plan.direction === 'out' ? other.id : athlete.id;

    await prisma.$transaction(async (tx) => {
      await tx.athleteConnection.create({
        data: {
          requesterId,
          addresseeId,
          status: plan.status,
          createdAt: daysAgo(now, plan.requestedDaysAgo, 22),
          respondedAt: plan.respondedDaysAgo === null ? null : daysAgo(now, plan.respondedDaysAgo, 23),
        },
        select: { id: true },
      });
      if (plan.status === ConnectionStatus.ACCEPTED) {
        await tx.athletePublicProfile.updateMany({
          where: { athleteId: { in: [requesterId, addresseeId] } },
          data: { connectionCountCache: { increment: 1 } },
        });
      }
    });
    const arrow = plan.direction === 'out' ? '→' : '←';
    console.log(`  ${plan.status.padEnd(9)} ${arrow} ${other.displayName}`);
  }
  console.log(`Connections fixture ready for ${athlete.slug}.`);
}

runFixture('connections fixture', main);
