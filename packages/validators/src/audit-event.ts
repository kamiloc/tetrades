import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Every audit event has a non-null actor and athlete (use SYSTEM_ACCOUNT for background jobs).
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const auditEventSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  actorUserAccountId: cuidSchema, /// L1-INTERNAL — required (SYSTEM_ACCOUNT for system actions)
  athleteId: cuidSchema, /// L1-INTERNAL — required so RLS can scope visibility
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
// NEVER include actorUserAccountId, metadata, or requestId
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
