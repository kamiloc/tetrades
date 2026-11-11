import type { MetricDefinitionPublicOutput } from '@packages/validators';
import { describe, expect, it } from 'vitest';

import { catalogForSport } from './metric-catalog';

const ATHLETICS = 'clxsport000000000000000001';
const SWIMMING = 'clxsport000000000000000002';

const def = (id: string, name: string, sportId: string | null): MetricDefinitionPublicOutput => ({
  id,
  key: name.toLowerCase().replace(/\W+/g, '_'),
  name,
  unit: 's',
  direction: 'LOWER_IS_BETTER',
  sportId,
});

describe('catalogForSport', () => {
  const definitions = [
    def('clxdef00000000000000000001', 'Sprint 100 m', ATHLETICS),
    def('clxdef00000000000000000002', '50 m libre', SWIMMING),
    def('clxdef00000000000000000003', 'Masa corporal', null),
    def('clxdef00000000000000000004', 'Salto largo', ATHLETICS),
    def('clxdef00000000000000000005', 'Frecuencia cardiaca en reposo', null),
  ];

  it("keeps the athlete's sport and the general metrics, each by name", () => {
    const catalog = catalogForSport(definitions, ATHLETICS);
    expect(catalog.sport.map((d) => d.name)).toEqual(['Salto largo', 'Sprint 100 m']);
    expect(catalog.general.map((d) => d.name)).toEqual(['Frecuencia cardiaca en reposo', 'Masa corporal']);
  });

  it("leaves out other sports' metrics", () => {
    const catalog = catalogForSport(definitions, SWIMMING);
    expect(catalog.sport.map((d) => d.name)).toEqual(['50 m libre']);
    expect([...catalog.sport, ...catalog.general].map((d) => d.name)).not.toContain('Sprint 100 m');
  });

  it('has only general metrics for a sport with none of its own', () => {
    const catalog = catalogForSport(definitions, 'clxsport000000000000000009');
    expect(catalog.sport).toEqual([]);
    expect(catalog.general).toHaveLength(2);
  });
});
