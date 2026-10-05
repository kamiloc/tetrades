import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  athleteMetricEntryListOutput,
  athleteMetricEntryOutput,
  listMetricEntriesInput,
  reportMetricEntryInput,
} from './athlete-metric-entry.js';
import {
  athleteMetricSummaryListOutput,
  athleteMetricSummaryOutput,
  getAthleteMetricSummariesInput,
} from './athlete-metric-summary.js';
import {
  athleteVisibilitySettingsOwnerOutput,
  updateAthleteVisibilityInput,
} from './athlete-visibility-settings.js';
import {
  clubMembershipMutationOutput,
  clubMembershipOwnerListOutput,
  clubMembershipOwnerOutput,
  clubRosterEntryOutput,
  clubRosterListOutput,
  inviteAthleteToClubInput,
  leaveClubInput,
  listClubRosterInput,
  listMyClubMembershipsInput,
  respondToClubInvitationInput,
} from './club-membership.js';
import { clubPublicOutput } from './club.js';
import {
  listMetricDefinitionsInput,
  metricDefinitionListOutput,
  metricDefinitionPublicOutput,
  metricDefinitionSchema,
} from './metric-definition.js';

const ID_A = 'ckv9z0a1b0000qz8x1y2z3a4b';
const ID_B = 'ckv9z0a1b0001qz8x1y2z3a4c';
const ID_C = 'ckv9z0a1b0002qz8x1y2z3a4d';

// Names of every L2-CONFIDENTIAL field in the model (plaintext and *Enc forms).
const L2_KEY = /^(exactDob|contactEmail|contactPhone|govId|governmentId)(Enc)?$/;

// Collects every object key reachable through objects, arrays, nullables,
// optionals, and effects.
function collectKeys(schema: z.ZodTypeAny, out: Set<string> = new Set()): Set<string> {
  const def: unknown = schema._def;
  if (typeof def !== 'object' || def === null) return out;
  const d = def as Record<string, unknown>;
  if (d.typeName === 'ZodObject') {
    const shape = (schema as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>;
    for (const [key, child] of Object.entries(shape)) {
      out.add(key);
      collectKeys(child, out);
    }
  }
  for (const inner of [d.innerType, d.type, d.schema]) {
    if (inner && typeof inner === 'object' && '_def' in inner) {
      collectKeys(inner as z.ZodTypeAny, out);
    }
  }
  return out;
}

describe('output schemas carry no L2 fields', () => {
  const outputs: Record<string, z.ZodTypeAny> = {
    clubPublicOutput,
    clubMembershipOwnerOutput,
    clubMembershipOwnerListOutput,
    clubRosterEntryOutput,
    clubRosterListOutput,
    clubMembershipMutationOutput,
    metricDefinitionPublicOutput,
    metricDefinitionListOutput,
    athleteMetricEntryOutput,
    athleteMetricEntryListOutput,
    athleteMetricSummaryOutput,
    athleteMetricSummaryListOutput,
    athleteVisibilitySettingsOwnerOutput,
  };

  for (const [name, schema] of Object.entries(outputs)) {
    it(name, () => {
      const keys = [...collectKeys(schema)];
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((k) => L2_KEY.test(k))).toEqual([]);
    });
  }

  it('roster exposes only L0 athlete identity', () => {
    expect(Object.keys(clubRosterEntryOutput.shape.athlete.shape).sort()).toEqual([
      'displayName',
      'id',
      'slug',
    ]);
  });

  it('membership outputs never expose trainer ids', () => {
    expect(collectKeys(clubMembershipOwnerOutput).has('invitedByClubTrainerId')).toBe(false);
    expect(collectKeys(clubRosterEntryOutput).has('invitedByClubTrainerId')).toBe(false);
  });
});

describe('club membership inputs', () => {
  it('accepts a valid invitation', () => {
    expect(inviteAthleteToClubInput.safeParse({ clubId: ID_A, athleteId: ID_B }).success).toBe(true);
  });

  it('rejects an invitation with a non-cuid id', () => {
    expect(
      inviteAthleteToClubInput.safeParse({ clubId: 'not-an-id', athleteId: ID_B }).success,
    ).toBe(false);
  });

  it('allows responding only with ACTIVE or REJECTED', () => {
    expect(respondToClubInvitationInput.safeParse({ membershipId: ID_A, status: 'ACTIVE' }).success).toBe(true);
    expect(respondToClubInvitationInput.safeParse({ membershipId: ID_A, status: 'REJECTED' }).success).toBe(true);
    for (const status of ['COMPLETED', 'PENDING_ATHLETE_CONFIRMATION', 'ACCEPTED']) {
      expect(respondToClubInvitationInput.safeParse({ membershipId: ID_A, status }).success).toBe(false);
    }
  });

  it('requires a membership id to leave', () => {
    expect(leaveClubInput.safeParse({ membershipId: ID_A }).success).toBe(true);
    expect(leaveClubInput.safeParse({}).success).toBe(false);
  });
});

describe('cursor list inputs', () => {
  it('default take to 20 and cap at 50', () => {
    expect(listMyClubMembershipsInput.parse({}).take).toBe(20);
    expect(listMyClubMembershipsInput.safeParse({ take: 51 }).success).toBe(false);
    expect(listClubRosterInput.safeParse({ clubId: ID_A, take: 50 }).success).toBe(true);
    expect(listClubRosterInput.safeParse({ take: 10 }).success).toBe(false);
    expect(listMetricDefinitionsInput.parse({}).take).toBe(20);
    expect(listMetricEntriesInput.safeParse({ athleteId: ID_A, take: 0 }).success).toBe(false);
  });

  it('rejects a non-cuid cursor', () => {
    expect(listMetricEntriesInput.safeParse({ athleteId: ID_A, cursor: 'abc' }).success).toBe(false);
  });
});

describe('metric definitions', () => {
  it('accepts snake_case keys and rejects others', () => {
    const base = { id: ID_A, name: 'Sprint 100 m', unit: 's', sportId: null, isActive: true };
    expect(metricDefinitionSchema.safeParse({ ...base, key: 'sprint_100m' }).success).toBe(true);
    expect(metricDefinitionSchema.safeParse({ ...base, key: 'Sprint-100m' }).success).toBe(false);
  });
});

describe('metric entry inputs', () => {
  const valid = {
    clubId: ID_A,
    athleteId: ID_B,
    metricDefinitionId: ID_C,
    value: 11.42,
    measuredAt: '2026-09-15T10:00:00.000Z',
  };

  it('accepts a valid report and coerces measuredAt', () => {
    const parsed = reportMetricEntryInput.parse(valid);
    expect(parsed.measuredAt).toBeInstanceOf(Date);
  });

  it('rejects non-finite values', () => {
    expect(reportMetricEntryInput.safeParse({ ...valid, value: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(reportMetricEntryInput.safeParse({ ...valid, value: '11.4' }).success).toBe(false);
  });

  it('does not accept a client-supplied trainer or membership id', () => {
    const parsed = reportMetricEntryInput.parse({
      ...valid,
      reportedByClubTrainerId: ID_A,
      clubMembershipId: ID_B,
    });
    expect(parsed).not.toHaveProperty('reportedByClubTrainerId');
    expect(parsed).not.toHaveProperty('clubMembershipId');
  });

  it('requires an athlete id for summaries', () => {
    expect(getAthleteMetricSummariesInput.safeParse({ athleteId: ID_A }).success).toBe(true);
    expect(getAthleteMetricSummariesInput.safeParse({}).success).toBe(false);
  });
});

describe('visibility inputs', () => {
  it('accepts a partial update', () => {
    expect(updateAthleteVisibilityInput.safeParse({ metricsAudience: 'CONNECTIONS' }).success).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateAthleteVisibilityInput.safeParse({}).success).toBe(false);
  });

  it('rejects an unknown audience', () => {
    expect(updateAthleteVisibilityInput.safeParse({ metricsAudience: 'FRIENDS' }).success).toBe(false);
  });

  it('owner output allows null updatedAt for defaults', () => {
    expect(
      athleteVisibilitySettingsOwnerOutput.safeParse({
        clubMembershipsAudience: 'PRIVATE',
        metricsAudience: 'PRIVATE',
        updatedAt: null,
      }).success,
    ).toBe(true);
  });
});
