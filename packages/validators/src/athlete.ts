import { z } from 'zod';

import { cuidSchema, countryCodeSchema, datetimeSchema, slugSchema } from './common.js';
import { profileStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const athleteSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  userAccountId: cuidSchema, /// L1-INTERNAL
  slug: slugSchema, /// L0-PUBLIC
  displayName: z.string().min(2).max(100), /// L0-PUBLIC
  sportId: cuidSchema, /// L0-PUBLIC
  countryCode: countryCodeSchema, /// L0-PUBLIC
  profileStatus: profileStatusEnum, /// L1-INTERNAL
  isUnderLegalHold: z.boolean(), /// L3-RESTRICTED — never expose in any output schema
  createdAt: datetimeSchema, /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type Athlete = z.infer<typeof athleteSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const createAthleteInput = z.object({
  slug: slugSchema,
  displayName: z.string().min(2).max(100),
  sportId: cuidSchema,
  countryCode: countryCodeSchema,
});
export type CreateAthleteInput = z.infer<typeof createAthleteInput>;

export const updateAthleteInput = z.object({
  displayName: z.string().min(2).max(100).optional(),
  sportId: cuidSchema.optional(),
  countryCode: countryCodeSchema.optional(),
});
export type UpdateAthleteInput = z.infer<typeof updateAthleteInput>;

export const updateAthleteProfileInput = z.object({
  bio: z.string().max(2000).optional(),
  heightCm: z.number().int().min(1).optional(),
  weightKg: z.number().min(1).optional(),
  sport: z.string().min(1).max(100).optional(),
});
export type UpdateAthleteProfileInput = z.infer<typeof updateAthleteProfileInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const athletePublicOutput = z.object({
  id: cuidSchema,
  slug: slugSchema,
  displayName: z.string(),
  sportId: cuidSchema,
  countryCode: countryCodeSchema,
});
export type AthletePublicOutput = z.infer<typeof athletePublicOutput>;

export const athleteOwnerOutput = athleteSchema.omit({
  isUnderLegalHold: true,
  userAccountId: true,
});
export type AthleteOwnerOutput = z.infer<typeof athleteOwnerOutput>;

// ──────────────────────────────────────────────
// QUERY INPUT SCHEMAS
// ──────────────────────────────────────────────

export const getAthleteBySlugInput = z.object({
  slug: slugSchema,
});
export type GetAthleteBySlugInput = z.infer<typeof getAthleteBySlugInput>;

export const getAthleteByIdInput = z.object({
  id: cuidSchema,
});
export type GetAthleteByIdInput = z.infer<typeof getAthleteByIdInput>;

export const getAthleteProfileInput = z.object({
  athleteId: cuidSchema,
});
export type GetAthleteProfileInput = z.infer<typeof getAthleteProfileInput>;

export const getAthletePublicProfileInput = z.object({
  slug: z.string(),
});
export type GetAthletePublicProfileInput = z.infer<typeof getAthletePublicProfileInput>;

export const searchAthletesInput = z.object({
  query: z.string(),
  sportId: cuidSchema.optional(),
  cursor: cuidSchema.optional(),
});
export type SearchAthletesInput = z.infer<typeof searchAthletesInput>;
