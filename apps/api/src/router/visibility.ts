import {
  athleteVisibilitySettingsOwnerOutput,
  updateAthleteVisibilityInput,
} from '@packages/validators';

import { requireViewerAthlete } from '../services/viewer.js';
import { getOwnSettings, updateOwnSettings } from '../services/visibility.js';
import { protectedProcedure, router } from '../trpc.js';

// Owner-only by construction: no athleteId input; the athlete is always
// ctx.userId's own (athlete-visibility spec).
export const visibilityRouter = router({
  get: protectedProcedure
    .output(athleteVisibilitySettingsOwnerOutput)
    .query(async ({ ctx }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return getOwnSettings(ctx.prisma, athleteId);
    }),

  update: protectedProcedure
    .input(updateAthleteVisibilityInput)
    .output(athleteVisibilitySettingsOwnerOutput)
    .mutation(async ({ ctx, input }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return updateOwnSettings(ctx.prisma, athleteId, input);
    }),
});
