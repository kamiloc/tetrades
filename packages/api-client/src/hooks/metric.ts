import type { ListMetricDefinitionsInput, ListMetricEntriesInput } from '@packages/validators';

import { trpc } from '../client.js';

// Public metric catalog.
export const useMetricDefinitions = (input: Partial<ListMetricDefinitionsInput> = {}) =>
  trpc.metric.listDefinitions.useQuery(input);

// Trainer: report an entry for an athlete with an ACTIVE membership in the club.
// Refreshes that athlete's summaries and entries.
export const useReportMetricEntry = () => {
  const utils = trpc.useUtils();
  return trpc.metric.reportEntry.useMutation({
    onSuccess: (_entry, { athleteId }) =>
      Promise.all([
        utils.metric.getSummaries.invalidate({ athleteId }),
        utils.metric.listEntries.invalidate({ athleteId }),
      ]),
  });
};

// Entries the caller may see under the athlete's visibility settings.
export const useMetricEntries = (
  input: Pick<ListMetricEntriesInput, 'athleteId'> & Partial<ListMetricEntriesInput>,
) => trpc.metric.listEntries.useQuery(input);

export const useMetricSummaries = (athleteId: string) =>
  trpc.metric.getSummaries.useQuery({ athleteId });
