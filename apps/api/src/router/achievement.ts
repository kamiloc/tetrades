import {
  athleteAchievementListOutput,
  athleteAchievementSchema,
  createAchievementInput,
  listAchievementsInput,
  verifyAchievementInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

export const achievementRouter = router({
  addAchievement: protectedProcedure
    .input(createAchievementInput)
    .output(athleteAchievementSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  listAchievements: protectedProcedure
    .input(listAchievementsInput)
    .output(athleteAchievementListOutput)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  verifyAchievement: protectedProcedure
    .input(verifyAchievementInput)
    .output(athleteAchievementSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),
});
