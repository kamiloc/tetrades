import {
  athletePrivateProfileSchema,
  athletePublicProfileListOutput,
  athletePublicProfileSchema,
  getAthleteProfileInput,
  getAthletePublicProfileInput,
  searchAthletesInput,
  updateAthleteProfileInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, publicProcedure, router } from '../trpc.js';

export const athleteRouter = router({
  getProfile: protectedProcedure
    .input(getAthleteProfileInput)
    .output(athletePrivateProfileSchema)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  updateProfile: protectedProcedure
    .input(updateAthleteProfileInput)
    .output(athletePrivateProfileSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  getPublicProfile: publicProcedure
    .input(getAthletePublicProfileInput)
    .output(athletePublicProfileSchema)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  searchAthletes: publicProcedure
    .input(searchAthletesInput)
    .output(athletePublicProfileListOutput)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),
});
