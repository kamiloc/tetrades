/**
 * Visibility service — pure rule (design D5, athlete-visibility spec).
 * Every audience × relation, plus the per-category missing-settings default.
 * The Prisma `where` form is exercised against the DB in
 * integration/metrics-service.int.test.ts.
 */
import type { VisibilityAudience } from '@packages/validators';
import { describe, expect, it } from 'vitest';

import {
  AUDIENCE_RELATIONS,
  CATEGORY_DEFAULT_AUDIENCE,
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
const CATEGORIES: VisibilityCategory[] = ['clubMemberships', 'metrics', 'achievements'];

const EXPECTED: Record<VisibilityAudience, Record<AudienceRelation, boolean>> = {
  PRIVATE: { OWNER: true, CONNECTION: false, STRANGER: false },
  CONNECTIONS: { OWNER: true, CONNECTION: true, STRANGER: false },
  PUBLIC: { OWNER: true, CONNECTION: true, STRANGER: true },
};

const FIELD: Record<VisibilityCategory, keyof AudienceSettings> = {
  clubMemberships: 'clubMembershipsAudience',
  metrics: 'metricsAudience',
  achievements: 'achievementsAudience',
};

function settingsWith(category: VisibilityCategory, audience: VisibilityAudience): AudienceSettings {
  // The other categories are set to the opposite extreme to prove categories are independent.
  const other: VisibilityAudience = audience === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
  return {
    clubMembershipsAudience: other,
    metricsAudience: other,
    achievementsAudience: other,
    [FIELD[category]]: audience,
  };
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

  describe('missing settings row resolves to the category default', () => {
    it('defaults are PRIVATE for club memberships and metrics, PUBLIC for achievements', () => {
      expect(CATEGORY_DEFAULT_AUDIENCE).toStrictEqual({
        clubMemberships: 'PRIVATE',
        metrics: 'PRIVATE',
        achievements: 'PUBLIC',
      });
    });

    for (const category of CATEGORIES) {
      const audience = CATEGORY_DEFAULT_AUDIENCE[category];
      it(`${category} → ${audience}`, () => {
        expect(audienceFor(category, null)).toBe(audience);
        for (const relation of RELATIONS) {
          expect(canView(category, relation, null)).toBe(EXPECTED[audience][relation]);
        }
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

  it('attach a missing settings row to the category default branch', () => {
    // Anonymous viewers get only the PUBLIC branch, so a missing row matches
    // there for achievements (default PUBLIC) and nowhere for metrics.
    expect(JSON.stringify(visibleAthleteWhere('achievements', null))).toContain(
      '{"visibilitySettings":{"is":null}}',
    );
    expect(JSON.stringify(visibleAthleteWhere('metrics', null))).not.toContain(
      '{"visibilitySettings":{"is":null}}',
    );
  });

  it('filter achievements on their own column', () => {
    const where = JSON.stringify(visibleAthleteWhere('achievements', null));
    expect(where).toContain('"achievementsAudience":"PUBLIC"');
    expect(where).not.toContain('metricsAudience');
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
