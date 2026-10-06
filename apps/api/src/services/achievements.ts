/**
 * Achievement reads (athlete-visibility spec, design D3 / D4).
 *
 * The owner sees every achievement in every verification status. Everyone
 * else — connections, strangers, anonymous callers, and trainers alike —
 * sees only VERIFIED achievements, and only when the athlete's achievements
 * audience admits them. The audience rule is the shared database filter
 * (visibleAthleteWhere), so any future list of achievements reuses it.
 *
 * Every caller gets the public shape: no L1 fields, no internal ids.
 */
import type { AthleteAchievementPublicListOutput } from '@packages/validators';
import type { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { Viewer } from './viewer.js';
import { visibleAthleteWhere } from './visibility.js';

const publicAchievementSelect = {
  id: true,
  title: true,
  organization: true,
  achievedOn: true,
  verificationStatus: true,
} as const;

/** Achievements `viewer` may see; empty when the audience does not admit them. */
export async function listAchievements(
  prisma: PrismaClient,
  viewer: Viewer | null,
  athleteId: string,
): Promise<AthleteAchievementPublicListOutput> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true },
  });
  if (athlete === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
  }

  const isOwner = viewer?.athleteId === athleteId;
  return prisma.athleteAchievement.findMany({
    where: isOwner
      ? { athleteId }
      : {
          athleteId,
          verificationStatus: 'VERIFIED',
          athlete: visibleAthleteWhere('achievements', viewer),
        },
    orderBy: [{ achievedOn: 'desc' }, { id: 'desc' }],
    select: publicAchievementSelect,
  });
}
