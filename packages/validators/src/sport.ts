import { z } from 'zod';

import { cuidSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const sportSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  name: z.string().min(2).max(100), /// L0-PUBLIC
  category: z.string().min(2).max(100), /// L0-PUBLIC
  isActive: z.boolean(), /// L0-PUBLIC
});
export type Sport = z.infer<typeof sportSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const createSportInput = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(100),
});
export type CreateSportInput = z.infer<typeof createSportInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const sportPublicOutput = sportSchema;
export type SportPublicOutput = z.infer<typeof sportPublicOutput>;

// ──────────────────────────────────────────────
// QUERY INPUT SCHEMAS
// ──────────────────────────────────────────────

export const searchSportsInput = z.object({
  category: z.string().min(1).max(100).optional(),
  query: z.string().min(1).max(100).optional(),
});
export type SearchSportsInput = z.infer<typeof searchSportsInput>;
