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
import { z } from 'zod';

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

  getMyAthlete: protectedProcedure
    .output(
      z.object({
        athleteId:   z.string(),
        displayName: z.string().nullable(),
        sport:       z.string().nullable(),
      }),
    )
    .query(async ({ ctx }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { id: true },
      });

      if (!userAccount) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User account not found' });
      }

      const athlete = await ctx.prisma.athlete.findUnique({
        where: { userAccountId: userAccount.id },
        select: {
          id: true,
          displayName: true,
          sport: { select: { name: true } },
        },
      });

      if (!athlete) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete profile not found for this user' });
      }

      return {
        athleteId:   athlete.id,
        displayName: athlete.displayName,
        sport:       athlete.sport.name,
      };
    }),

  /**
   * Onboarding state for the routing layer. Returns whether the user has a
   * UserAccount (created by the auth.users → user_accounts trigger) and an
   * Athlete record (created by `bootstrap` after the user submits the
   * onboarding form).
   *
   * Unlike `getMyAthlete` this NEVER throws on missing rows — the routing
   * layer needs a deterministic decision tree without try/catch.
   */
  getOnboardingState: protectedProcedure
    .output(
      z.object({
        hasUserAccount: z.boolean(),
        hasAthlete:     z.boolean(),
        athleteId:      z.string().nullable(),
      }),
    )
    .query(async ({ ctx }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { id: true, athlete: { select: { id: true } } },
      });

      if (!userAccount) {
        return { hasUserAccount: false, hasAthlete: false, athleteId: null };
      }

      return {
        hasUserAccount: true,
        hasAthlete:     userAccount.athlete !== null,
        athleteId:      userAccount.athlete?.id ?? null,
      };
    }),

  /**
   * Onboarding mutation. Creates the Athlete row with profileStatus=DRAFT and
   * transitions the UserAccount from PENDING → ACTIVE. Slug is generated
   * server-side from displayName + a short random suffix to avoid collisions.
   *
   * Idempotent at the conflict level: if an Athlete already exists, returns
   * its id instead of erroring. The displayName/sport/country submitted on a
   * second call are ignored — use `updateProfile` to change them later.
   */
  bootstrap: protectedProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(2).max(100),
        sportId:     z.string().min(1),
        countryCode: z.string().length(2).toUpperCase(),
      }),
    )
    .output(z.object({ athleteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Upsert UserAccount as a defensive fallback when the auth.users →
      // user_accounts Postgres trigger has not been applied yet. With the
      // trigger in place this is a no-op (the row already exists).
      const userAccount = await ctx.prisma.userAccount.upsert({
        where:  { supabaseUserId: ctx.userId },
        create: {
          supabaseUserId: ctx.userId,
          role:           'ATHLETE',
          status:         'PENDING',
        },
        update: {},
        select: { id: true, athlete: { select: { id: true } } },
      });

      if (userAccount.athlete) {
        return { athleteId: userAccount.athlete.id };
      }

      const sport = await ctx.prisma.sport.findUnique({
        where: { id: input.sportId },
        select: { id: true, isActive: true },
      });
      if (!sport || !sport.isActive) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sport not available' });
      }

      const slug = generateSlug(input.displayName);

      const created = await ctx.prisma.$transaction(async (tx) => {
        const athlete = await tx.athlete.create({
          data: {
            userAccountId: userAccount.id,
            slug,
            displayName:   input.displayName,
            sportId:       input.sportId,
            countryCode:   input.countryCode,
            profileStatus: 'DRAFT',
          },
          select: { id: true },
        });

        await tx.userAccount.update({
          where: { id: userAccount.id },
          data:  { status: 'ACTIVE' },
        });

        return athlete;
      });

      return { athleteId: created.id };
    }),
});

// Slug: lowercase, accent-stripped displayName + 6-char random suffix.
// The suffix avoids hitting the unique constraint without a retry loop.
function generateSlug(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFD')
    // Strip combining diacritical marks (U+0300–U+036F) — accents on Latin chars.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'athlete';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
