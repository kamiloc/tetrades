import type { MetricDefinitionPublicOutput } from '@packages/validators';

// The log dialog's catalog (design D4): the athlete's sport metrics, then the
// general ones (sportId null). Other sports' metrics are left out.

export interface MetricCatalog {
  sport: MetricDefinitionPublicOutput[];
  general: MetricDefinitionPublicOutput[];
}

const byName = (a: MetricDefinitionPublicOutput, b: MetricDefinitionPublicOutput) =>
  a.name.localeCompare(b.name, 'en');

export function catalogForSport(
  definitions: readonly MetricDefinitionPublicOutput[],
  sportId: string,
): MetricCatalog {
  return {
    sport: definitions.filter((d) => d.sportId === sportId).sort(byName),
    general: definitions.filter((d) => d.sportId === null).sort(byName),
  };
}
