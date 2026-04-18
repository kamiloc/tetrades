import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const auditEventSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  userAccountId: cuidSchema.nullable(), /// L1-INTERNAL
  athleteId: cuidSchema.nullable(), /// L1-INTERNAL
  eventType: z.string().min(1).max(100), /// L1-INTERNAL
  targetType: z.string().min(1).max(100), /// L1-INTERNAL
  targetId: z.string().min(1).max(255), /// L1-INTERNAL
  purposeCode: z.string().min(1).max(100), /// L1-INTERNAL
  requestId: z.string().min(1).max(255), /// L1-INTERNAL
  metadata: z.record(z.string(), z.unknown()).nullable(), /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// NEVER include userAccountId, metadata, or requestId
// ──────────────────────────────────────────────

export const auditEventOwnerOutput = z.object({
  id: cuidSchema,
  eventType: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  purposeCode: z.string(),
  createdAt: datetimeSchema,
});
export type AuditEventOwnerOutput = z.infer<typeof auditEventOwnerOutput>;
