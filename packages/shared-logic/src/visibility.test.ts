import { describe, expect, it } from 'vitest';

import {
  AUDIENCE_DEFAULTS,
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  audienceDefaultLabel,
} from './visibility.js';

describe('visibility audiences', () => {
  it('offers exactly Private, Connections, Public in that order', () => {
    expect(AUDIENCE_OPTIONS.map((a) => AUDIENCE_LABELS[a])).toEqual([
      'Private',
      'Connections',
      'Public',
    ]);
  });

  it('defaults achievements to Public and clubs/metrics to Private (ADR-013, ADR-014)', () => {
    expect(AUDIENCE_DEFAULTS).toEqual({
      achievementsAudience: 'PUBLIC',
      clubMembershipsAudience: 'PRIVATE',
      metricsAudience: 'PRIVATE',
    });
  });

  it('labels each default', () => {
    expect(audienceDefaultLabel('achievementsAudience')).toBe('Default: Public');
    expect(audienceDefaultLabel('metricsAudience')).toBe('Default: Private');
  });
});
