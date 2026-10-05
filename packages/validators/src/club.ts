import { z } from 'zod';

import { cuidSchema, countryCodeSchema, datetimeSchema, slugSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Clubs are provisioned out-of-band (seed / service role); no create input.
// ──────────────────────────────────────────────

export const clubSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  slug: slugSchema, /// L0-PUBLIC
  name: z.string().min(2).max(150), /// L0-PUBLIC
  countryCode: countryCodeSchema, /// L0-PUBLIC
  city: z.string().min(1).max(100).nullable(), /// L0-PUBLIC
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type Club = z.infer<typeof clubSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

// Base input of every trainer-only procedure: the club the caller acts for.
// The caller's trainer row for this club is resolved server-side.
export const clubScopedInput = z.object({
  clubId: cuidSchema,
});
export type ClubScopedInput = z.infer<typeof clubScopedInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const clubPublicOutput = clubSchema.omit({ createdAt: true });
export type ClubPublicOutput = z.infer<typeof clubPublicOutput>;
