import { z } from 'zod';

import { cuidSchema, paginatedOutput, paginationInput } from './common.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Catalog is service-role managed; no create/update input (sport-metrics spec).
// ──────────────────────────────────────────────

export const metricKeySchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Metric key must be lowercase snake_case');

export const metricDefinitionSchema = z.object({
  id: cuidSchema, /// L0-PUBLIC
  key: metricKeySchema, /// L0-PUBLIC
  name: z.string().min(2).max(100), /// L0-PUBLIC
  unit: z.string().min(1).max(20), /// L0-PUBLIC
  sportId: cuidSchema.nullable(), /// L0-PUBLIC
  isActive: z.boolean(), /// L0-PUBLIC
});
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const listMetricDefinitionsInput = paginationInput.extend({
  sportId: cuidSchema.optional(),
});
export type ListMetricDefinitionsInput = z.infer<typeof listMetricDefinitionsInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const metricDefinitionPublicOutput = metricDefinitionSchema.omit({ isActive: true });
export type MetricDefinitionPublicOutput = z.infer<typeof metricDefinitionPublicOutput>;

export const metricDefinitionListOutput = paginatedOutput(metricDefinitionPublicOutput);
export type MetricDefinitionListOutput = z.infer<typeof metricDefinitionListOutput>;
