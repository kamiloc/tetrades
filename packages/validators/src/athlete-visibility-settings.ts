import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { visibilityAudienceEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Owner-only. A missing row means PRIVATE for every category (ADR-013).
// ──────────────────────────────────────────────

export const athleteVisibilitySettingsSchema = z.object({
  athleteId: cuidSchema, /// L1-INTERNAL
  clubMembershipsAudience: visibilityAudienceEnum, /// L1-INTERNAL
  metricsAudience: visibilityAudienceEnum, /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AthleteVisibilitySettings = z.infer<typeof athleteVisibilitySettingsSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS — athlete derived from ctx.userId
// ──────────────────────────────────────────────

export const updateAthleteVisibilityInput = athleteVisibilitySettingsSchema
  .pick({ clubMembershipsAudience: true, metricsAudience: true })
  .partial()
  .refine(
    (v) => v.clubMembershipsAudience !== undefined || v.metricsAudience !== undefined,
    { message: 'At least one visibility setting must be provided' },
  );
export type UpdateAthleteVisibilityInput = z.infer<typeof updateAthleteVisibilityInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// updatedAt is null when no row exists yet (defaults applied).
// ──────────────────────────────────────────────

export const athleteVisibilitySettingsOwnerOutput = athleteVisibilitySettingsSchema
  .pick({ clubMembershipsAudience: true, metricsAudience: true })
  .extend({ updatedAt: datetimeSchema.nullable() });
export type AthleteVisibilitySettingsOwnerOutput = z.infer<
  typeof athleteVisibilitySettingsOwnerOutput
>;
