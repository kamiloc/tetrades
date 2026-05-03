import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { ocrJobStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// L2 fields are stored encrypted as Bytes; their Zod type is z.instanceof(Uint8Array).
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const ocrJobSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  medicalDocumentId: cuidSchema, /// L1-INTERNAL
  athleteId: cuidSchema, /// L1-INTERNAL — denormalized for direct RLS (must equal medicalDocument.athleteId)
  modelName: z.string().min(1).max(100), /// L1-INTERNAL
  promptVersion: z.string().min(1).max(50), /// L1-INTERNAL
  status: ocrJobStatusEnum, /// L1-INTERNAL
  rawOutputEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL (encrypted JSON; immutable once set)
  parsedDataEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL (encrypted JSON; structured medical data)
  confidenceMap: z.record(z.string(), z.unknown()).nullable(), /// L1-INTERNAL — numeric scores, not medical values
  schemaValid: z.boolean(), /// L1-INTERNAL
  retryCount: z.number().int().min(0), /// L1-INTERNAL
  requestId: z.string().min(1).max(255), /// L1-INTERNAL
  startedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  finishedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type OcrJob = z.infer<typeof ocrJobSchema>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// NEVER include requestId (L1-INTERNAL infrastructure correlation ID).
// NEVER include rawOutputEnc or parsedDataEnc (encrypted L2 internals).
// athleteId is omitted — the client already knows their own ID.
// ──────────────────────────────────────────────

export const ocrJobOwnerOutput = z.object({
  id: cuidSchema,
  status: ocrJobStatusEnum,
  confidenceMap: z.record(z.string(), z.unknown()).nullable(),
  schemaValid: z.boolean(),
  retryCount: z.number().int(),
  startedAt: datetimeSchema.nullable(),
  finishedAt: datetimeSchema.nullable(),
});
export type OcrJobOwnerOutput = z.infer<typeof ocrJobOwnerOutput>;
