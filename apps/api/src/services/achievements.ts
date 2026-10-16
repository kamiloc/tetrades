/**
 * Achievement reads (athlete-visibility spec, design D3 / D4).
 *
 * The owner sees every achievement in every verification status. Everyone
 * else — connections, strangers, anonymous callers, and trainers alike —
 * sees only VERIFIED achievements, and only when the athlete's achievements
 * audience admits them. The audience rule is the shared database filter
 * (visibleAthleteWhere), so any future list of achievements reuses it.
 *
 * Every caller gets the public shape: no L1 fields, no internal ids. The
 * certifying club's name is added only when the club-memberships audience
 * also admits the caller (the owner always sees it).
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
import {
  canView,
  loadAudienceSettings,
  resolveAudienceRelation,
  visibleAthleteWhere,
} from './visibility.js';

const publicAchievementSelect = {
  id: true,
  title: true,
  organization: true,
  achievedOn: true,
  verificationStatus: true,
  // The club behind the most recent approval (achievement-certification).
  // Legacy VERIFIED rows have none.
  certificationRequests: {
    where: { status: 'APPROVED' },
    orderBy: { decidedAt: 'desc' },
    take: 1,
    select: { club: { select: { name: true } } },
  },
} as const;

/**
 * The certifying club reveals a club association, so non-owners see it only
 * when the athlete's club-memberships audience also admits them (athlete-
 * visibility spec, design D5). Decided once per call for the whole page.
 */
async function canSeeCertifyingClub(
  prisma: PrismaClient,
  viewer: Viewer | null,
  athleteId: string,
): Promise<boolean> {
  const [relation, settings] = await Promise.all([
    resolveAudienceRelation(prisma, viewer, athleteId),
    loadAudienceSettings(prisma, athleteId),
  ]);
  return canView('clubMemberships', relation, settings);
}

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
  const [rows, showClub] = await Promise.all([
    prisma.athleteAchievement.findMany({
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
    }),
    isOwner ? Promise.resolve(true) : canSeeCertifyingClub(prisma, viewer, athleteId),
  ]);
  return toPage(
    rows.map(({ certificationRequests, ...row }) => {
      const club = certificationRequests[0]?.club;
      return {
        ...row,
        // Only a currently VERIFIED row is certified; an edit resets it.
        certifyingClub:
          showClub && row.verificationStatus === 'VERIFIED' && club !== undefined
            ? { name: club.name }
            : null,
      };
    }),
    input.take,
    (a) => a.id,
  );
}
