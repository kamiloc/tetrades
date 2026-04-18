import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { ocrJobStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const ocrJobSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  medicalDocumentId: cuidSchema, /// L2-CONFIDENTIAL
  modelName: z.string().min(1).max(100), /// L1-INTERNAL
  promptVersion: z.string().min(1).max(50), /// L1-INTERNAL
  status: ocrJobStatusEnum, /// L1-INTERNAL
  confidenceMap: z.record(z.string(), z.unknown()).nullable(), /// L2-CONFIDENTIAL
  schemaValid: z.boolean(), /// L1-INTERNAL
  retryCount: z.number().int().min(0), /// L1-INTERNAL
  requestId: z.string().min(1).max(255), /// L1-INTERNAL
  startedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  finishedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type OcrJob = z.infer<typeof ocrJobSchema>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// NEVER include requestId (L1-INTERNAL infrastructure)
// NEVER include rawOutput or parsedData
// ──────────────────────────────────────────────

export const ocrJobOwnerOutput = z.object({
  id: cuidSchema,
  status: ocrJobStatusEnum,
  schemaValid: z.boolean(),
  retryCount: z.number().int(),
  startedAt: datetimeSchema.nullable(),
  finishedAt: datetimeSchema.nullable(),
});
export type OcrJobOwnerOutput = z.infer<typeof ocrJobOwnerOutput>;
