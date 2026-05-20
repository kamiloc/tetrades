import {
  athleteAchievementListOutput,
  athleteAchievementSchema,
  createAchievementInput,
  listAchievementsInput,
  verifyAchievementInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

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

  listAchievements: protectedProcedure
    .input(listAchievementsInput)
    .output(athleteAchievementListOutput)
    .query(async ({ ctx, input }) => {
      const targetAthlete = await ctx.prisma.athlete.findUnique({
        where: { id: input.athleteId },
        select: { id: true, userAccount: { select: { supabaseUserId: true } } },
      });

      if (!targetAthlete) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      const isOwner = targetAthlete.userAccount.supabaseUserId === ctx.userId;

      const achievements = await ctx.prisma.athleteAchievement.findMany({
        where: isOwner
          ? { athleteId: input.athleteId }
          : { athleteId: input.athleteId, verificationStatus: 'VERIFIED' },
        select: achievementSelect,
        orderBy: { achievedOn: 'desc' },
      });

      return achievements;
    }),

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
