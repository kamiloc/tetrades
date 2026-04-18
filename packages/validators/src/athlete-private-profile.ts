import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { onboardingStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Encrypted fields use Uint8Array (Buffer extends Uint8Array).
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const athletePrivateProfileSchema = z.object({
  athleteId: cuidSchema, /// L2-CONFIDENTIAL
  exactDobEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL
  contactEmailEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL
  contactPhoneEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL
  govIdEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL
  encryptionKeyVersion: z.string().min(1).max(50), /// L1-INTERNAL
  onboardingStatus: onboardingStatusEnum, /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AthletePrivateProfile = z.infer<typeof athletePrivateProfileSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS — accept plaintext, encrypted by server
// ──────────────────────────────────────────────

export const updateAthletePrivateProfileInput = z.object({
  exactDob: z.string().date().optional(),
  contactEmail: z.string().email().max(254).optional(),
  contactPhone: z.string().min(7).max(20).optional(),
  govId: z.string().min(5).max(30).optional(),
});
export type UpdateAthletePrivateProfileInput = z.infer<typeof updateAthletePrivateProfileInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — decrypted values via separate field names
// NEVER includes encryptionKeyVersion (L1-INTERNAL infra)
// ──────────────────────────────────────────────

export const athletePrivateProfileOwnerOutput = z.object({
  athleteId: cuidSchema,
  exactDob: z.string().date().nullable(),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().nullable(),
  govId: z.string().nullable(),
  onboardingStatus: onboardingStatusEnum,
  updatedAt: datetimeSchema,
});
export type AthletePrivateProfileOwnerOutput = z.infer<typeof athletePrivateProfileOwnerOutput>;
