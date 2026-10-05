import type { ListMetricDefinitionsInput, ListMetricEntriesInput } from '@packages/validators';

import { trpc } from '../client.js';

// Public metric catalog.
export const useMetricDefinitions = (input: Partial<ListMetricDefinitionsInput> = {}) =>
  trpc.metric.listDefinitions.useQuery(input);

// Trainer: report an entry for an athlete with an ACTIVE membership in the club.
export const useReportMetricEntry = () => trpc.metric.reportEntry.useMutation();

// Entries the caller may see under the athlete's visibility settings.
export const useMetricEntries = (
  input: Pick<ListMetricEntriesInput, 'athleteId'> & Partial<ListMetricEntriesInput>,
) => trpc.metric.listEntries.useQuery(input);

export const useMetricSummaries = (athleteId: string) =>
  trpc.metric.getSummaries.useQuery({ athleteId });
