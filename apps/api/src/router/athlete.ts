import { decryptPII, encryptPII } from '@packages/crypto';
import {
  athletePrivateProfileOwnerOutput,
  athletePublicProfileListOutput,
  athletePublicProfileSchema,
  getAthleteProfileInput,
  getAthletePublicProfileInput,
  searchAthletesInput,
  updateAthletePrivateProfileInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { getEnv } from '../env.js';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';

export const athleteRouter = router({
  getProfile: protectedProcedure
    .input(getAthleteProfileInput)
    .output(athletePrivateProfileOwnerOutput)
    .query(async ({ ctx, input }) => {
      const athlete = await ctx.prisma.athlete.findUnique({
        where: { id: input.athleteId },
        select: {
          id: true,
          userAccount: { select: { supabaseUserId: true } },
        },
      });

      if (!athlete) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      if (athlete.userAccount.supabaseUserId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const privateProfile = await ctx.prisma.athletePrivateProfile.findUnique({
        where: { athleteId: input.athleteId },
        select: {
          athleteId: true,
          exactDobEnc: true,
          contactEmailEnc: true,
          contactPhoneEnc: true,
          govIdEnc: true,
          onboardingStatus: true,
          updatedAt: true,
        },
      });

      if (!privateProfile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Private profile not found' });
      }

      const masterKey = getEnv().MASTER_ENCRYPTION_KEY;
      const auditBase = {
        actorId: ctx.userId,
        purpose: 'getProfile',
        targetTable: 'athlete_private_profiles',
        targetRecordId: privateProfile.athleteId,
        requestId: ctx.requestId,
      };

      return {
        athleteId: privateProfile.athleteId,
        exactDob: privateProfile.exactDobEnc
          ? decryptPII(Buffer.from(privateProfile.exactDobEnc), masterKey, { ...auditBase, targetField: 'exactDobEnc' })
          : null,
        contactEmail: privateProfile.contactEmailEnc
          ? decryptPII(Buffer.from(privateProfile.contactEmailEnc), masterKey, { ...auditBase, targetField: 'contactEmailEnc' })
          : null,
        contactPhone: privateProfile.contactPhoneEnc
          ? decryptPII(Buffer.from(privateProfile.contactPhoneEnc), masterKey, { ...auditBase, targetField: 'contactPhoneEnc' })
          : null,
        govId: privateProfile.govIdEnc
          ? decryptPII(Buffer.from(privateProfile.govIdEnc), masterKey, { ...auditBase, targetField: 'govIdEnc' })
          : null,
        onboardingStatus: privateProfile.onboardingStatus,
        updatedAt: privateProfile.updatedAt,
      };
    }),

  updateProfile: protectedProcedure
    .input(updateAthletePrivateProfileInput)
    .output(athletePrivateProfileOwnerOutput)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: {
          athlete: { select: { id: true } },
        },
      });

      const athleteId = userAccount?.athlete?.id;
      if (!athleteId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      const masterKey = getEnv().MASTER_ENCRYPTION_KEY;

      const updateData = {
        ...(input.exactDob !== undefined
          ? { exactDobEnc: Uint8Array.from(encryptPII(input.exactDob, masterKey)) }
          : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmailEnc: Uint8Array.from(encryptPII(input.contactEmail, masterKey)) }
          : {}),
        ...(input.contactPhone !== undefined
          ? { contactPhoneEnc: Uint8Array.from(encryptPII(input.contactPhone, masterKey)) }
          : {}),
        ...(input.govId !== undefined
          ? { govIdEnc: Uint8Array.from(encryptPII(input.govId, masterKey)) }
          : {}),
      };

      const privateProfile = await ctx.prisma.athletePrivateProfile.update({
        where: { athleteId },
        data: updateData,
        select: {
          athleteId: true,
          exactDobEnc: true,
          contactEmailEnc: true,
          contactPhoneEnc: true,
          govIdEnc: true,
          onboardingStatus: true,
          updatedAt: true,
        },
      });

      const auditBase = {
        actorId: ctx.userId,
        purpose: 'updateProfile',
        targetTable: 'athlete_private_profiles',
        targetRecordId: privateProfile.athleteId,
        requestId: ctx.requestId,
      };

      return {
        athleteId: privateProfile.athleteId,
        exactDob: privateProfile.exactDobEnc
          ? decryptPII(Buffer.from(privateProfile.exactDobEnc), masterKey, { ...auditBase, targetField: 'exactDobEnc' })
          : null,
        contactEmail: privateProfile.contactEmailEnc
          ? decryptPII(Buffer.from(privateProfile.contactEmailEnc), masterKey, { ...auditBase, targetField: 'contactEmailEnc' })
          : null,
        contactPhone: privateProfile.contactPhoneEnc
          ? decryptPII(Buffer.from(privateProfile.contactPhoneEnc), masterKey, { ...auditBase, targetField: 'contactPhoneEnc' })
          : null,
        govId: privateProfile.govIdEnc
          ? decryptPII(Buffer.from(privateProfile.govIdEnc), masterKey, { ...auditBase, targetField: 'govIdEnc' })
          : null,
        onboardingStatus: privateProfile.onboardingStatus,
        updatedAt: privateProfile.updatedAt,
      };
    }),

  getPublicProfile: publicProcedure
    .input(getAthletePublicProfileInput)
    .output(athletePublicProfileSchema)
    .query(async ({ ctx, input }) => {
      const publicProfile = await ctx.prisma.athletePublicProfile.findFirst({
        where: {
          athlete: { slug: input.slug },
        },
        select: {
          athleteId: true,
          publicBio: true,
          city: true,
          primaryPosition: true,
          connectionCountCache: true,
          avatarAssetId: true,
          isSearchable: true,
          updatedAt: true,
        },
      });

      if (!publicProfile) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      return publicProfile;
    }),

  searchAthletes: publicProcedure
    .input(searchAthletesInput)
    .output(athletePublicProfileListOutput)
    .query(async ({ ctx, input }) => {
      const pageSize = 20;

      const profiles = await ctx.prisma.athletePublicProfile.findMany({
        where: {
          isSearchable: true,
          athlete: {
            ...(input.query.length > 0
              ? { displayName: { contains: input.query, mode: 'insensitive' } }
              : {}),
            ...(input.sportId !== undefined ? { sportId: input.sportId } : {}),
          },
        },
        select: {
          athleteId: true,
          publicBio: true,
          city: true,
          primaryPosition: true,
          connectionCountCache: true,
          avatarAssetId: true,
          isSearchable: true,
          updatedAt: true,
        },
        orderBy: { athlete: { displayName: 'asc' } },
        ...(input.cursor !== undefined
          ? { cursor: { athleteId: input.cursor }, skip: 1 }
          : {}),
        take: pageSize,
      });

      return profiles;
    }),
});
