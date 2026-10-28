// Visibility audiences and per-category defaults (ADR-013, ADR-014). Literal
// values mirror `visibilityAudienceEnum` in @packages/validators; apps/api
// asserts the two stay identical at compile time.

export const AUDIENCE_OPTIONS = ['PRIVATE', 'CONNECTIONS', 'PUBLIC'] as const;

export type AudienceValue = (typeof AUDIENCE_OPTIONS)[number];

export const AUDIENCE_LABELS: Readonly<Record<AudienceValue, string>> = {
  PRIVATE: 'Private',
  CONNECTIONS: 'Connections',
  PUBLIC: 'Public',
};

export type VisibilityCategory =
  | 'achievementsAudience'
  | 'clubMembershipsAudience'
  | 'metricsAudience';

// What applies when the athlete has never saved a setting.
export const AUDIENCE_DEFAULTS: Readonly<Record<VisibilityCategory, AudienceValue>> = {
  achievementsAudience: 'PUBLIC',
  clubMembershipsAudience: 'PRIVATE',
  metricsAudience: 'PRIVATE',
};

export function audienceDefaultLabel(category: VisibilityCategory): string {
  return `Default: ${AUDIENCE_LABELS[AUDIENCE_DEFAULTS[category]]}`;
}
