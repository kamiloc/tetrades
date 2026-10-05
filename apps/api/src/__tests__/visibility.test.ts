/**
 * Visibility service — pure rule (design D5, athlete-visibility spec).
 * Every audience × relation, plus the missing-settings (PRIVATE) default.
 * The Prisma `where` form is exercised against the DB in
 * integration/metrics-service.int.test.ts.
 */
import type { VisibilityAudience } from '@packages/validators';
import { describe, expect, it } from 'vitest';

import {
  AUDIENCE_RELATIONS,
  audienceFor,
  canView,
  metricEntryVisibilityWhere,
  visibleAthleteWhere,
  type AudienceRelation,
  type AudienceSettings,
  type VisibilityCategory,
} from '../services/visibility.js';

const AUDIENCES: VisibilityAudience[] = ['PRIVATE', 'CONNECTIONS', 'PUBLIC'];
const RELATIONS: AudienceRelation[] = ['OWNER', 'CONNECTION', 'STRANGER'];
const CATEGORIES: VisibilityCategory[] = ['clubMemberships', 'metrics'];

const EXPECTED: Record<VisibilityAudience, Record<AudienceRelation, boolean>> = {
  PRIVATE: { OWNER: true, CONNECTION: false, STRANGER: false },
  CONNECTIONS: { OWNER: true, CONNECTION: true, STRANGER: false },
  PUBLIC: { OWNER: true, CONNECTION: true, STRANGER: true },
};

function settingsWith(category: VisibilityCategory, audience: VisibilityAudience): AudienceSettings {
  // The other category is set to the opposite extreme to prove categories are independent.
  const other: VisibilityAudience = audience === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
  return category === 'metrics'
    ? { metricsAudience: audience, clubMembershipsAudience: other }
    : { clubMembershipsAudience: audience, metricsAudience: other };
}

describe('canView', () => {
  for (const category of CATEGORIES) {
    for (const audience of AUDIENCES) {
      for (const relation of RELATIONS) {
        const expected = EXPECTED[audience][relation];
        it(`${category}: ${audience} × ${relation} → ${expected ? 'visible' : 'hidden'}`, () => {
          expect(canView(category, relation, settingsWith(category, audience))).toBe(expected);
        });
      }
    }
  }

  describe('missing settings row resolves to PRIVATE', () => {
    for (const category of CATEGORIES) {
      it(category, () => {
        expect(audienceFor(category, null)).toBe('PRIVATE');
        expect(canView(category, 'OWNER', null)).toBe(true);
        expect(canView(category, 'CONNECTION', null)).toBe(false);
        expect(canView(category, 'STRANGER', null)).toBe(false);
      });
    }
  });

  it('owner access is never narrowed by any audience', () => {
    for (const audience of AUDIENCES) {
      expect(AUDIENCE_RELATIONS[audience]).toContain('OWNER');
    }
  });
});

describe('where builders', () => {
  it('give an anonymous viewer only the PUBLIC branch', () => {
    const where = visibleAthleteWhere('metrics', null);
    expect(where.OR).toHaveLength(1);
    expect(JSON.stringify(where)).toContain('"PUBLIC"');
    expect(JSON.stringify(where)).not.toContain('"PRIVATE"');
  });

  it('give an athlete viewer a branch for every audience, including missing settings', () => {
    const where = visibleAthleteWhere('metrics', {
      supabaseUserId: 's',
      userAccountId: 'u',
      athleteId: 'a',
    });
    expect(where.OR).toHaveLength(3);
    expect(JSON.stringify(where)).toContain('{"visibilitySettings":{"is":null}}');
  });

  it('add the active-club trainer branch only for signed-in viewers', () => {
    expect(JSON.stringify(metricEntryVisibilityWhere(null))).not.toContain('trainers');
    const where = metricEntryVisibilityWhere({ supabaseUserId: 's', userAccountId: 'u', athleteId: null });
    expect(JSON.stringify(where)).toContain('"status":"ACTIVE"');
    expect(JSON.stringify(where)).toContain('"userAccountId":"u"');
  });
});
