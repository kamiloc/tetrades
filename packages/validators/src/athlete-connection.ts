import { z } from 'zod';

import { cuidSchema, datetimeSchema, uuidSchema } from './common.js';
import { connectionStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// ──────────────────────────────────────────────

export const athleteConnectionSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  requesterId: cuidSchema, /// L1-INTERNAL
  addresseeId: cuidSchema, /// L1-INTERNAL
  status: connectionStatusEnum, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  respondedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type AthleteConnection = z.infer<typeof athleteConnectionSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const sendConnectionRequestInput = z.object({
  addresseeId: cuidSchema,
});
export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestInput>;

export const sendAthleteConnectionRequestInput = z.object({
  targetAthleteId: uuidSchema,
});
export type SendAthleteConnectionRequestInput = z.infer<
  typeof sendAthleteConnectionRequestInput
>;

export const respondConnectionInput = z.object({
  connectionId: cuidSchema,
  status: z.enum(['ACCEPTED', 'DECLINED']),
});
export type RespondConnectionInput = z.infer<typeof respondConnectionInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const athleteConnectionOwnerOutput = athleteConnectionSchema;
export type AthleteConnectionOwnerOutput = z.infer<typeof athleteConnectionOwnerOutput>;

export const athleteConnectionListOutput = z.array(athleteConnectionSchema);
export type AthleteConnectionListOutput = z.infer<typeof athleteConnectionListOutput>;

export const connectionIdInput = z.object({
  connectionId: uuidSchema,
});
export type ConnectionIdInput = z.infer<typeof connectionIdInput>;

export const listConnectionsInput = z.object({
  athleteId: cuidSchema,
});
export type ListConnectionsInput = z.infer<typeof listConnectionsInput>;
