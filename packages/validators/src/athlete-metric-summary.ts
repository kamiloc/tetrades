import { z } from 'zod';

import { metricValueSchema } from './athlete-metric-entry.js';
import { cuidSchema, datetimeSchema } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Derived from entries inside the reportEntry transaction; clients never
// write summaries. PK is (athleteId, metricDefinitionId).
// ──────────────────────────────────────────────

export const athleteMetricSummarySchema = z.object({
  athleteId: cuidSchema, /// L1-INTERNAL
  metricDefinitionId: cuidSchema, /// L1-INTERNAL
  latestValue: metricValueSchema, /// L1-INTERNAL
  latestMeasuredAt: datetimeSchema, /// L1-INTERNAL
  entryCount: z.number().int().min(0), /// L1-INTERNAL
  updatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AthleteMetricSummary = z.infer<typeof athleteMetricSummarySchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const getAthleteMetricSummariesInput = z.object({
  athleteId: cuidSchema,
});
export type GetAthleteMetricSummariesInput = z.infer<typeof getAthleteMetricSummariesInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — no L2 fields
// Bounded by the metric catalog size, so not paginated.
// ──────────────────────────────────────────────

export const athleteMetricSummaryOutput = athleteMetricSummarySchema.omit({
  athleteId: true,
  updatedAt: true,
});
export type AthleteMetricSummaryOutput = z.infer<typeof athleteMetricSummaryOutput>;

export const athleteMetricSummaryListOutput = z.array(athleteMetricSummaryOutput);
export type AthleteMetricSummaryListOutput = z.infer<typeof athleteMetricSummaryListOutput>;
