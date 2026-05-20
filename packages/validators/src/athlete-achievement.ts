import { z } from 'zod';

import { cuidSchema, datetimeSchema, uuidSchema } from './common.js';
import { verificationStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const athleteAchievementSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  athleteId: cuidSchema, /// L0-PUBLIC
  title: z.string().min(2).max(200), /// L0-PUBLIC
  organization: z.string().min(2).max(200), /// L0-PUBLIC
  achievedOn: datetimeSchema, /// L0-PUBLIC
  verificationStatus: verificationStatusEnum, /// L0-PUBLIC
  verificationSource: z.string().min(1).max(500).nullable(), /// L0-PUBLIC
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type AthleteAchievement = z.infer<typeof athleteAchievementSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const createAthleteAchievementInput = z.object({
  title: z.string().min(2).max(200),
  organization: z.string().min(2).max(200),
  achievedOn: z.string().date(),
});
export type CreateAthleteAchievementInput = z.infer<typeof createAthleteAchievementInput>;

export const createAchievementInput = createAthleteAchievementInput;
export type CreateAchievementInput = z.infer<typeof createAchievementInput>;

export const updateAthleteAchievementInput = z.object({
  title: z.string().min(2).max(200).optional(),
  organization: z.string().min(2).max(200).optional(),
  achievedOn: z.string().date().optional(),
});
export type UpdateAthleteAchievementInput = z.infer<typeof updateAthleteAchievementInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const athleteAchievementPublicOutput = z.object({
  id: cuidSchema,
  title: z.string(),
  organization: z.string(),
  achievedOn: datetimeSchema,
  verificationStatus: verificationStatusEnum,
});
export type AthleteAchievementPublicOutput = z.infer<typeof athleteAchievementPublicOutput>;

export const athleteAchievementOwnerOutput = athleteAchievementSchema;
export type AthleteAchievementOwnerOutput = z.infer<typeof athleteAchievementOwnerOutput>;

export const athleteAchievementListOutput = z.array(athleteAchievementSchema);
export type AthleteAchievementListOutput = z.infer<typeof athleteAchievementListOutput>;

export const listAchievementsInput = z.object({
  athleteId: uuidSchema,
});
export type ListAchievementsInput = z.infer<typeof listAchievementsInput>;

export const verifyAchievementInput = z.object({
  achievementId: uuidSchema,
});
export type VerifyAchievementInput = z.infer<typeof verifyAchievementInput>;
