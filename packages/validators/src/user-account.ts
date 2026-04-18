import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { accountStatusEnum, userRoleEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const userAccountSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  supabaseUserId: z.string().min(1).max(255), /// L1-INTERNAL
  role: userRoleEnum, /// L1-INTERNAL
  status: accountStatusEnum, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type UserAccount = z.infer<typeof userAccountSchema>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const userAccountOwnerOutput = userAccountSchema.omit({
  supabaseUserId: true,
});
export type UserAccountOwnerOutput = z.infer<typeof userAccountOwnerOutput>;
