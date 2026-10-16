import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  certificationMutationOutput,
  decideCertificationInput,
  listMyCertificationRequestsInput,
  listPendingCertificationsInput,
  myCertificationRequestListOutput,
  myCertificationRequestOutput,
  pendingCertificationListOutput,
  pendingCertificationOutput,
  requestCertificationInput,
  withdrawCertificationInput,
} from './achievement-certification.js';

const ID_A = 'ckv9z0a1b0000qz8x1y2z3a4b';
const ID_B = 'ckv9z0a1b0001qz8x1y2z3a4c';

// Names of every L2-CONFIDENTIAL field in the model (plaintext and *Enc forms).
const L2_KEY = /^(exactDob|contactEmail|contactPhone|govId|governmentId)(Enc)?$/;

// Collects every object key reachable through objects, arrays, nullables,
// optionals, and effects (same walk as clubs-metrics-visibility.test.ts).
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

describe('decideCertificationInput', () => {
  const base = { clubId: ID_A, requestId: ID_B };

  it('accepts an approval and drops any reason sent with it', () => {
    const parsed = decideCertificationInput.parse({
      ...base,
      decision: 'APPROVE',
      rejectionReason: 'ignored',
    });
    expect(parsed).toEqual({ ...base, decision: 'APPROVE' });
  });

  it('requires a non-blank reason of at most 300 characters to reject', () => {
    expect(decideCertificationInput.safeParse({ ...base, decision: 'REJECT' }).success).toBe(false);
    expect(
      decideCertificationInput.safeParse({ ...base, decision: 'REJECT', rejectionReason: '   ' })
        .success,
    ).toBe(false);
    expect(
      decideCertificationInput.safeParse({
        ...base,
        decision: 'REJECT',
        rejectionReason: 'x'.repeat(301),
      }).success,
    ).toBe(false);
    const parsed = decideCertificationInput.parse({
      ...base,
      decision: 'REJECT',
      rejectionReason: '  La planilla oficial no coincide con la fecha.  ',
    });
    expect(parsed).toMatchObject({
      rejectionReason: 'La planilla oficial no coincide con la fecha.',
    });
  });

  it('rejects an unknown decision', () => {
    expect(decideCertificationInput.safeParse({ ...base, decision: 'MAYBE' }).success).toBe(false);
  });
});

describe('request and withdraw inputs', () => {
  it('need cuid ids', () => {
    expect(requestCertificationInput.safeParse({ achievementId: ID_A, clubId: ID_B }).success).toBe(
      true,
    );
    expect(
      requestCertificationInput.safeParse({ achievementId: 'nope', clubId: ID_B }).success,
    ).toBe(false);
    expect(withdrawCertificationInput.safeParse({ requestId: ID_A }).success).toBe(true);
    expect(withdrawCertificationInput.safeParse({}).success).toBe(false);
  });
});

describe('list inputs', () => {
  it('default take to 20 and cap at 50', () => {
    expect(listMyCertificationRequestsInput.parse({}).take).toBe(20);
    expect(listMyCertificationRequestsInput.safeParse({ take: 51 }).success).toBe(false);
    expect(listPendingCertificationsInput.parse({ clubId: ID_A }).take).toBe(20);
    expect(listPendingCertificationsInput.safeParse({ clubId: ID_A, take: 51 }).success).toBe(
      false,
    );
    expect(listPendingCertificationsInput.safeParse({}).success).toBe(false);
  });
});

describe('output schemas', () => {
  const outputs: Record<string, z.ZodTypeAny> = {
    myCertificationRequestOutput,
    myCertificationRequestListOutput,
    pendingCertificationOutput,
    pendingCertificationListOutput,
    certificationMutationOutput,
  };

  for (const [name, schema] of Object.entries(outputs)) {
    it(`${name} carries no L2 field`, () => {
      expect([...collectKeys(schema)].filter((k) => L2_KEY.test(k))).toEqual([]);
    });
  }

  it('the trainer queue item exposes no rejection reason, trainer id, or membership id', () => {
    const keys = collectKeys(pendingCertificationOutput);
    for (const hidden of [
      'rejectionReason',
      'decidedByClubTrainerId',
      'clubMembershipId',
      'status',
    ]) {
      expect(keys.has(hidden)).toBe(false);
    }
  });

  it('the athlete view exposes no deciding trainer or membership id', () => {
    const keys = collectKeys(myCertificationRequestOutput);
    expect(keys.has('decidedByClubTrainerId')).toBe(false);
    expect(keys.has('clubMembershipId')).toBe(false);
    expect(keys.has('rejectionReason')).toBe(true);
  });
});
