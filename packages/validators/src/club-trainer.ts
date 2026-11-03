import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// A user is a trainer of a club only through a non-revoked row here, of an
// active club (ADR-013, ADR-017); there is no global trainer role. Rows are
// created when the invitee accepts a trainer invitation and are never
// deleted: revocation sets `revokedAt`. Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const clubTrainerSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  clubId: cuidSchema, /// L1-INTERNAL
  userAccountId: cuidSchema, /// L1-INTERNAL
  revokedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type ClubTrainer = z.infer<typeof clubTrainerSchema>;
