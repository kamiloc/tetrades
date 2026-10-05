import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// A user is a trainer of a club only through a row here (ADR-013); there is
// no global trainer role. Provisioned out-of-band; no create input.
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const clubTrainerSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  clubId: cuidSchema, /// L1-INTERNAL
  userAccountId: cuidSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type ClubTrainer = z.infer<typeof clubTrainerSchema>;
