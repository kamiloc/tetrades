import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';
import { documentStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// L2 fields are stored encrypted as Bytes; their Zod type is z.instanceof(Uint8Array)
// (Buffer extends Uint8Array — this avoids requiring @types/node in this package).
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const medicalDocumentSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL — opaque identifier, the encrypted CONTENT is L2
  athleteId: cuidSchema, /// L1-INTERNAL — FK; the relationship is L1, the content is L2
  documentTypeEnc: z.instanceof(Uint8Array), /// L2-CONFIDENTIAL (encrypted)
  objectPathEnc: z.instanceof(Uint8Array), /// L2-CONFIDENTIAL (encrypted)
  mimeType: z.string().min(1).max(100), /// L1-INTERNAL — file format, not content
  sha256: z.string().min(64).max(64), /// L1-INTERNAL — integrity hash, not content
  status: documentStatusEnum, /// L1-INTERNAL — workflow status, not medical data itself
  verifiedDataEnc: z.instanceof(Uint8Array).nullable(), /// L2-CONFIDENTIAL (encrypted JSON)
  verifiedByUserAccountId: cuidSchema.nullable(), /// L1-INTERNAL
  uploadedAt: datetimeSchema, /// L1-INTERNAL
  verifiedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type MedicalDocument = z.infer<typeof medicalDocumentSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS — clients send PLAINTEXT; the server encrypts before persisting.
// Field names DO NOT carry the _Enc suffix at the input boundary.
// ──────────────────────────────────────────────

export const createMedicalDocumentInput = z.object({
  documentType: z.string().min(1).max(50),
  objectPath: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  sha256: z.string().min(64).max(64),
});
export type CreateMedicalDocumentInput = z.infer<typeof createMedicalDocumentInput>;

export const verifyMedicalDocumentInput = z
  .object({
    documentId: cuidSchema,
    approved: z.boolean(),
    verifiedData: z.record(z.string(), z.unknown()).optional(),
    rejectionReason: z.string().min(1).max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.approved && !data.verifiedData) return false;
      if (!data.approved && !data.rejectionReason) return false;
      return true;
    },
    { message: 'Approved requires verifiedData. Rejected requires rejectionReason.' },
  );
export type VerifyMedicalDocumentInput = z.infer<typeof verifyMedicalDocumentInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — return DECRYPTED plaintext.
// NEVER include objectPath (signed URL generated server-side).
// NEVER include rawOutputEnc / parsedDataEnc (those live on OcrJob and are internal).
// ──────────────────────────────────────────────

export const medicalDocumentOwnerOutput = z.object({
  id: cuidSchema,
  documentType: z.string(),
  status: documentStatusEnum,
  uploadedAt: datetimeSchema,
  verifiedAt: datetimeSchema.nullable(),
});
export type MedicalDocumentOwnerOutput = z.infer<typeof medicalDocumentOwnerOutput>;

export const medicalDocumentDetailOutput = medicalDocumentOwnerOutput.extend({
  verifiedData: z.record(z.string(), z.unknown()).nullable(),
});
export type MedicalDocumentDetailOutput = z.infer<typeof medicalDocumentDetailOutput>;

// ──────────────────────────────────────────────
// QUERY INPUT SCHEMAS
// ──────────────────────────────────────────────

export const getMedicalDocumentByIdInput = z.object({
  id: cuidSchema,
});
export type GetMedicalDocumentByIdInput = z.infer<typeof getMedicalDocumentByIdInput>;

export const uploadMedicalDocumentInput = z.object({
  fileName: z.string(),
  mimeType: z.string(),
});
export type UploadMedicalDocumentInput = z.infer<typeof uploadMedicalDocumentInput>;

export const uploadMedicalDocumentOutput = z.object({
  documentId: cuidSchema,
  uploadUrl: z.string().url(),
});
export type UploadMedicalDocumentOutput = z.infer<typeof uploadMedicalDocumentOutput>;

export const medicalDocumentIdInput = z.object({
  documentId: cuidSchema,
});
export type MedicalDocumentIdInput = z.infer<typeof medicalDocumentIdInput>;

export const rejectMedicalDocumentInput = z.object({
  documentId: cuidSchema,
  reason: z.string().min(1),
});
export type RejectMedicalDocumentInput = z.infer<typeof rejectMedicalDocumentInput>;
