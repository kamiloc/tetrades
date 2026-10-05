import { z } from 'zod';

import { cuidSchema, datetimeSchema, paginatedOutput, paginationInput } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Append-only: no update or delete inputs exist (sport-metrics spec).
// `value` is a Prisma Decimal; services convert it to number at the boundary.
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const metricValueSchema = z.number().finite();

export const athleteMetricEntrySchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  athleteId: cuidSchema, /// L1-INTERNAL
  metricDefinitionId: cuidSchema, /// L1-INTERNAL
  clubMembershipId: cuidSchema, /// L1-INTERNAL — the ACTIVE membership that authorized the write
  reportedByClubTrainerId: cuidSchema, /// L1-INTERNAL
  value: metricValueSchema, /// L1-INTERNAL
  measuredAt: datetimeSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type AthleteMetricEntry = z.infer<typeof athleteMetricEntrySchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// The reporting trainer is derived from ctx.userId; the authorizing
// membership is resolved server-side from (clubId, athleteId, ACTIVE).
// ──────────────────────────────────────────────

export const reportMetricEntryInput = z.object({
  clubId: cuidSchema,
  athleteId: cuidSchema,
  metricDefinitionId: cuidSchema,
  value: metricValueSchema,
  measuredAt: datetimeSchema,
});
export type ReportMetricEntryInput = z.infer<typeof reportMetricEntryInput>;

export const listMetricEntriesInput = paginationInput.extend({
  athleteId: cuidSchema,
  metricDefinitionId: cuidSchema.optional(),
});
export type ListMetricEntriesInput = z.infer<typeof listMetricEntriesInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — no L2 fields
// ──────────────────────────────────────────────

export const athleteMetricEntryOutput = athleteMetricEntrySchema
  .pick({
    id: true,
    metricDefinitionId: true,
    reportedByClubTrainerId: true,
    value: true,
    measuredAt: true,
    createdAt: true,
  })
  .extend({
    clubId: cuidSchema, /// L0-PUBLIC
  });
export type AthleteMetricEntryOutput = z.infer<typeof athleteMetricEntryOutput>;

export const athleteMetricEntryListOutput = paginatedOutput(athleteMetricEntryOutput);
export type AthleteMetricEntryListOutput = z.infer<typeof athleteMetricEntryListOutput>;
