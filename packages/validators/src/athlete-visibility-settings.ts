import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { visibilityAudienceEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Owner-only. A missing row means the category default: PRIVATE for club
// memberships and metrics (ADR-013), PUBLIC for achievements (ADR-014).
// ──────────────────────────────────────────────

export const athleteVisibilitySettingsSchema = z.object({
  athleteId: cuidSchema, /// L1-INTERNAL
  clubMembershipsAudience: visibilityAudienceEnum, /// L1-INTERNAL
  metricsAudience: visibilityAudienceEnum, /// L1-INTERNAL
  achievementsAudience: visibilityAudienceEnum, /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AthleteVisibilitySettings = z.infer<typeof athleteVisibilitySettingsSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS — athlete derived from ctx.userId
// ──────────────────────────────────────────────

export const updateAthleteVisibilityInput = athleteVisibilitySettingsSchema
  .pick({ clubMembershipsAudience: true, metricsAudience: true, achievementsAudience: true })
  .partial()
  .refine(
    (v) =>
      v.clubMembershipsAudience !== undefined ||
      v.metricsAudience !== undefined ||
      v.achievementsAudience !== undefined,
    { message: 'At least one visibility setting must be provided' },
  );
export type UpdateAthleteVisibilityInput = z.infer<typeof updateAthleteVisibilityInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// updatedAt is null when no row exists yet (defaults applied).
// ──────────────────────────────────────────────

export const athleteVisibilitySettingsOwnerOutput = athleteVisibilitySettingsSchema
  .pick({ clubMembershipsAudience: true, metricsAudience: true, achievementsAudience: true })
  .extend({ updatedAt: datetimeSchema.nullable() });
export type AthleteVisibilitySettingsOwnerOutput = z.infer<
  typeof athleteVisibilitySettingsOwnerOutput
>;
