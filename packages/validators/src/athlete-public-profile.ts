import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const athletePublicProfileSchema = z.object({
  athleteId: cuidSchema, /// L0-PUBLIC
  publicBio: z.string().max(2000).nullable(), /// L0-PUBLIC
  city: z.string().min(1).max(100).nullable(), /// L0-PUBLIC
  primaryPosition: z.string().min(1).max(100).nullable(), /// L0-PUBLIC
  connectionCountCache: z.number().int().min(0), /// L0-PUBLIC
  avatarAssetId: cuidSchema.nullable(), /// L0-PUBLIC — must reference a same-athlete, non-ORIGINAL ProfilePhotoAsset
  isSearchable: z.boolean(), /// L0-PUBLIC
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AthletePublicProfile = z.infer<typeof athletePublicProfileSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const updateAthletePublicProfileInput = z.object({
  publicBio: z.string().max(2000).optional(),
  city: z.string().min(1).max(100).optional(),
  primaryPosition: z.string().min(1).max(100).optional(),
  isSearchable: z.boolean().optional(),
});
export type UpdateAthletePublicProfileInput = z.infer<typeof updateAthletePublicProfileInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — omits updatedAt (L1-INTERNAL)
// ──────────────────────────────────────────────

export const athletePublicProfileOutput = athletePublicProfileSchema.omit({
  updatedAt: true,
});
export type AthletePublicProfileOutput = z.infer<typeof athletePublicProfileOutput>;
