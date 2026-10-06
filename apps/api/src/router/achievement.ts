import {
  athleteAchievementPublicListOutput,
  athleteAchievementSchema,
  createAchievementInput,
  listAchievementsInput,
  verifyAchievementInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { listAchievements } from '../services/achievements.js';
import { resolveViewer } from '../services/viewer.js';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';

const achievementSelect = {
  id: true,
  athleteId: true,
  title: true,
  organization: true,
  achievedOn: true,
  verificationStatus: true,
  verificationSource: true,
  createdAt: true,
} as const;

export const achievementRouter = router({
  addAchievement: protectedProcedure
    .input(createAchievementInput)
    .output(athleteAchievementSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });

      const athleteId = userAccount?.athlete?.id;
      if (!athleteId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      const achievement = await ctx.prisma.athleteAchievement.create({
        data: {
          athleteId,
          title: input.title,
          organization: input.organization,
          achievedOn: new Date(input.achievedOn),
          verificationStatus: 'PENDING',
        },
        select: achievementSelect,
      });

      return achievement;
    }),

  // Public: anonymous callers see achievements whose audience is PUBLIC.
  // Visibility and the verified-only rule live in services/achievements.ts.
  listAchievements: publicProcedure
    .input(listAchievementsInput)
    .output(athleteAchievementPublicListOutput)
    .query(async ({ ctx, input }) =>
      listAchievements(ctx.prisma, await resolveViewer(ctx.prisma, ctx.userId), input),
    ),

  verifyAchievement: protectedProcedure
    .input(verifyAchievementInput)
    .output(athleteAchievementSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { role: true },
      });

      if (userAccount?.role !== 'SYSTEM') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can verify achievements',
        });
      }

      const achievement = await ctx.prisma.athleteAchievement.findUnique({
        where: { id: input.achievementId },
        select: achievementSelect,
      });

      if (!achievement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Achievement not found' });
      }

      if (achievement.verificationStatus === 'VERIFIED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Achievement is already verified',
        });
      }

      const updated = await ctx.prisma.athleteAchievement.update({
        where: { id: input.achievementId },
        data: { verificationStatus: 'VERIFIED' },
        select: achievementSelect,
      });

      return updated;
    }),
});
