import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { photoVariantEnum, processingStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const profilePhotoAssetSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  athleteId: cuidSchema, /// L0-PUBLIC
  variant: photoVariantEnum, /// L0-PUBLIC
  objectPath: z.string().min(1).max(500), /// L1-INTERNAL
  width: z.number().int().min(1), /// L0-PUBLIC
  height: z.number().int().min(1), /// L0-PUBLIC
  processingStatus: processingStatusEnum, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type ProfilePhotoAsset = z.infer<typeof profilePhotoAssetSchema>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const profilePhotoAssetPublicOutput = z.object({
  id: cuidSchema,
  variant: photoVariantEnum,
  width: z.number().int(),
  height: z.number().int(),
  objectPath: z.string(),
});
export type ProfilePhotoAssetPublicOutput = z.infer<typeof profilePhotoAssetPublicOutput>;

export const profilePhotoAssetOwnerOutput = z.object({
  id: cuidSchema,
  athleteId: cuidSchema,
  variant: photoVariantEnum,
  width: z.number().int(),
  height: z.number().int(),
  processingStatus: processingStatusEnum,
  createdAt: datetimeSchema,
});
export type ProfilePhotoAssetOwnerOutput = z.infer<typeof profilePhotoAssetOwnerOutput>;
