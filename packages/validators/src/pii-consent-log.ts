import { z } from 'zod';

import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const piiConsentLogSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  athleteId: cuidSchema, /// L1-INTERNAL
  purposeCode: z.string().min(1).max(100), /// L1-INTERNAL
  consentVersion: z.string().min(1).max(50), /// L1-INTERNAL
  granted: z.boolean(), /// L1-INTERNAL
  grantedAt: datetimeSchema, /// L1-INTERNAL
  revokedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  evidenceRef: z.string().min(1).max(500).nullable(), /// L1-INTERNAL
});
export type PiiConsentLog = z.infer<typeof piiConsentLogSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const grantConsentInput = z.object({
  purposeCode: z.string().min(1).max(100),
  consentVersion: z.string().min(1).max(50),
});
export type GrantConsentInput = z.infer<typeof grantConsentInput>;

export const revokeConsentInput = z.object({
  purposeCode: z.string().min(1).max(100),
});
export type RevokeConsentInput = z.infer<typeof revokeConsentInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const piiConsentLogOwnerOutput = z.object({
  id: cuidSchema,
  purposeCode: z.string(),
  consentVersion: z.string(),
  granted: z.boolean(),
  grantedAt: datetimeSchema,
  revokedAt: datetimeSchema.nullable(),
});
export type PiiConsentLogOwnerOutput = z.infer<typeof piiConsentLogOwnerOutput>;
