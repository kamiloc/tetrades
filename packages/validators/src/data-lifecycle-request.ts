import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { dataLifecycleStatusEnum, dataLifecycleTypeEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const dataLifecycleRequestSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  athleteId: cuidSchema, /// L1-INTERNAL
  requestedBy: cuidSchema, /// L1-INTERNAL
  requestType: dataLifecycleTypeEnum, /// L1-INTERNAL
  status: dataLifecycleStatusEnum, /// L1-INTERNAL
  artifactPath: z.string().min(1).max(500).nullable(), /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  expiresAt: datetimeSchema.nullable(), /// L1-INTERNAL
  completedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type DataLifecycleRequest = z.infer<typeof dataLifecycleRequestSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// No fields needed — athlete is derived from ctx
// ──────────────────────────────────────────────

export const createExportRequestInput = z.object({});
export type CreateExportRequestInput = z.infer<typeof createExportRequestInput>;

export const createDeletionRequestInput = z.object({});
export type CreateDeletionRequestInput = z.infer<typeof createDeletionRequestInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// NEVER include artifactPath (signed URL generated server-side)
// ──────────────────────────────────────────────

export const dataLifecycleRequestOwnerOutput = z.object({
  id: cuidSchema,
  requestType: dataLifecycleTypeEnum,
  status: dataLifecycleStatusEnum,
  createdAt: datetimeSchema,
  expiresAt: datetimeSchema.nullable(),
  completedAt: datetimeSchema.nullable(),
});
export type DataLifecycleRequestOwnerOutput = z.infer<typeof dataLifecycleRequestOwnerOutput>;
