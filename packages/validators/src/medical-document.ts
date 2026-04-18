import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { documentStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const medicalDocumentSchema = z.object({
  id: cuidSchema, /// L2-CONFIDENTIAL
  athleteId: cuidSchema, /// L2-CONFIDENTIAL
  documentType: z.string().min(1).max(100), /// L2-CONFIDENTIAL
  objectPath: z.string().min(1).max(500), /// L2-CONFIDENTIAL
  mimeType: z.string().min(1).max(100), /// L1-INTERNAL
  sha256: z.string().min(64).max(64), /// L1-INTERNAL
  status: documentStatusEnum, /// L2-CONFIDENTIAL
  verifiedData: z.record(z.string(), z.unknown()).nullable(), /// L2-CONFIDENTIAL
  ocrRawOutput: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL
  ocrParsedData: z.record(z.string(), z.unknown()).nullable(), /// L2-CONFIDENTIAL
  verifiedByUserAccountId: cuidSchema.nullable(), /// L1-INTERNAL
  uploadedAt: datetimeSchema, /// L2-CONFIDENTIAL
  verifiedAt: datetimeSchema.nullable(), /// L2-CONFIDENTIAL
});
export type MedicalDocument = z.infer<typeof medicalDocumentSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const createMedicalDocumentInput = z.object({
  documentType: z.string().min(1).max(100),
  objectPath: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  sha256: z.string().min(64).max(64),
});
export type CreateMedicalDocumentInput = z.infer<typeof createMedicalDocumentInput>;

export const verifyMedicalDocumentInput = z.object({
  documentId: cuidSchema,
  verifiedData: z.record(z.string(), z.unknown()),
  approved: z.boolean(),
  rejectionReason: z.string().min(1).max(1000).optional(),
});
export type VerifyMedicalDocumentInput = z.infer<typeof verifyMedicalDocumentInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// NEVER include objectPath (signed URL generated server-side)
// NEVER include ocrRawOutput or ocrParsedData
// ──────────────────────────────────────────────

export const medicalDocumentOwnerOutput = z.object({
  id: cuidSchema,
  documentType: z.string(),
  status: documentStatusEnum,
  uploadedAt: datetimeSchema,
  verifiedAt: datetimeSchema.nullable(),
});
export type MedicalDocumentOwnerOutput = z.infer<typeof medicalDocumentOwnerOutput>;

export const medicalDocumentDetailOutput = z.object({
  id: cuidSchema,
  documentType: z.string(),
  status: documentStatusEnum,
  verifiedData: z.record(z.string(), z.unknown()).nullable(),
  uploadedAt: datetimeSchema,
  verifiedAt: datetimeSchema.nullable(),
});
export type MedicalDocumentDetailOutput = z.infer<typeof medicalDocumentDetailOutput>;

// ──────────────────────────────────────────────
// QUERY INPUT SCHEMAS
// ──────────────────────────────────────────────

export const getMedicalDocumentByIdInput = z.object({
  id: cuidSchema,
});
export type GetMedicalDocumentByIdInput = z.infer<typeof getMedicalDocumentByIdInput>;
