import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { adminActionEnum, adminActionTargetTypeEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Append-only record of every successful admin write (ADR-017), inserted in
// the same transaction as the write. Only the API's database connection
// writes it; client roles have no access. Never returned by any procedure.
// ──────────────────────────────────────────────

// Metadata holds ids, counts and changed field NAMES only. Never an email,
// never a field value, never L2. Unknown keys are rejected so a caller can't
// slip a value in.
export const adminActionMetadataSchema = z
  .object({
    clubId: cuidSchema.optional(),
    changedFields: z.array(z.enum(['name', 'countryCode', 'city'])).optional(),
    cancelledCertificationRequests: z.number().int().nonnegative().optional(),
    rejectedMembershipInvitations: z.number().int().nonnegative().optional(),
    revokedTrainerInvitations: z.number().int().nonnegative().optional(),
    closedExpiredInvitationId: cuidSchema.optional(),
  })
  .strict();
export type AdminActionMetadata = z.infer<typeof adminActionMetadataSchema>;

export const adminActionLogSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  actorUserAccountId: cuidSchema, /// L1-INTERNAL
  action: adminActionEnum, /// L1-INTERNAL
  targetType: adminActionTargetTypeEnum, /// L1-INTERNAL
  targetId: cuidSchema, /// L1-INTERNAL
  requestId: z.string().min(1), /// L1-INTERNAL
  metadata: adminActionMetadataSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type AdminActionLog = z.infer<typeof adminActionLogSchema>;
