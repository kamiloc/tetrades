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
 * The procedure is public, so reads are always cursor-paginated (take ≤ 50).
 */
import type {
  AthleteAchievementPublicListOutput,
  ListAchievementsInput,
} from '@packages/validators';
import type { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { cursorArgs, toPage } from '../lib/pagination.js';

import type { Viewer } from './viewer.js';
import { visibleAthleteWhere } from './visibility.js';

const publicAchievementSelect = {
  id: true,
  title: true,
  organization: true,
  achievedOn: true,
  verificationStatus: true,
} as const;

/** A page of achievements `viewer` may see; empty when the audience does not admit them. */
export async function listAchievements(
  prisma: PrismaClient,
  viewer: Viewer | null,
  input: ListAchievementsInput,
): Promise<AthleteAchievementPublicListOutput> {
  const { athleteId } = input;
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true },
  });
  if (athlete === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
  }

  const isOwner = viewer?.athleteId === athleteId;
  const rows = await prisma.athleteAchievement.findMany({
    where: isOwner
      ? { athleteId }
      : {
          athleteId,
          verificationStatus: 'VERIFIED',
          athlete: visibleAthleteWhere('achievements', viewer),
        },
    orderBy: [{ achievedOn: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: publicAchievementSelect,
  });
  return toPage(rows, input.take, (a) => a.id);
}
