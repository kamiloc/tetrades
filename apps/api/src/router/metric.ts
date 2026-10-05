import {
  athleteMetricEntryListOutput,
  athleteMetricEntryOutput,
  athleteMetricSummaryListOutput,
  getAthleteMetricSummariesInput,
  listMetricDefinitionsInput,
  listMetricEntriesInput,
  metricDefinitionListOutput,
  reportMetricEntryInput,
} from '@packages/validators';

import { getSummaries, listDefinitions, listEntries, reportEntry } from '../services/metrics.js';
import { resolveViewer } from '../services/viewer.js';
import { publicProcedure, router, trainerProcedure } from '../trpc.js';

// Entries are append-only: no update or delete procedures (sport-metrics spec).
// Reads are public and filtered by the visibility service, so anonymous,
// stranger, connection, owner, and active-club trainer callers all go through
// the same rule.
export const metricRouter = router({
  listDefinitions: publicProcedure
    .input(listMetricDefinitionsInput)
    .output(metricDefinitionListOutput)
    .query(({ ctx, input }) => listDefinitions(ctx.prisma, input)),

  reportEntry: trainerProcedure
    .input(reportMetricEntryInput)
    .output(athleteMetricEntryOutput)
    .mutation(({ ctx, input }) => reportEntry(ctx.prisma, ctx.clubTrainer, input)),

  listEntries: publicProcedure
    .input(listMetricEntriesInput)
    .output(athleteMetricEntryListOutput)
    .query(async ({ ctx, input }) =>
      listEntries(ctx.prisma, await resolveViewer(ctx.prisma, ctx.userId), input),
    ),

  getSummaries: publicProcedure
    .input(getAthleteMetricSummariesInput)
    .output(athleteMetricSummaryListOutput)
    .query(async ({ ctx, input }) =>
      getSummaries(ctx.prisma, await resolveViewer(ctx.prisma, ctx.userId), input.athleteId),
    ),
});
