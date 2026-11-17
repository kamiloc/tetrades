import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  adminActionEntryOutput,
  adminActionListOutput,
  adminOverviewOutput,
  listAdminActionsInput,
} from './admin-action-log.js';
import {
  adminTrainerDirectoryEntryOutput,
  adminTrainerDirectoryListOutput,
  listAdminTrainersInput,
} from './club-trainer-invitation.js';
import { listAdminClubsInput } from './club.js';

import * as index from './index.js';

const ID_A = 'ckv9z0a1b0000qz8x1y2z3a4b';

// Names of every L2-CONFIDENTIAL field in the model (plaintext and *Enc forms).
const L2_KEY = /^(exactDob|contactEmail|contactPhone|govId|governmentId)(Enc)?$/;

// Same walk as club-trainer-invitation.test.ts.
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

const short = 'a';
const long = 'a'.repeat(101);

describe('listAdminClubsInput search and trainer filter', () => {
  it('accepts a trimmed query and the trainer filter with a status', () => {
    expect(
      listAdminClubsInput.parse({
        query: '  liga ',
        status: 'DEACTIVATED',
        withoutActiveTrainer: true,
      }),
    ).toEqual({ take: 20, status: 'DEACTIVATED', query: 'liga', withoutActiveTrainer: true });
  });

  it('rejects a 1-character and a 101-character query', () => {
    expect(listAdminClubsInput.safeParse({ query: short }).success).toBe(false);
    expect(listAdminClubsInput.safeParse({ query: long }).success).toBe(false);
  });
});

describe('listAdminTrainersInput', () => {
  it('defaults to ALL and 20 rows', () => {
    expect(listAdminTrainersInput.parse({})).toEqual({ take: 20, access: 'ALL' });
  });

  it('accepts each access state', () => {
    for (const access of ['ACTIVE', 'CLUB_DEACTIVATED', 'REVOKED', 'ALL']) {
      expect(listAdminTrainersInput.safeParse({ access }).success).toBe(true);
    }
  });

  it('rejects an unknown access, a bad clubQuery and take 51', () => {
    expect(listAdminTrainersInput.safeParse({ access: 'PENDING' }).success).toBe(false);
    expect(listAdminTrainersInput.safeParse({ clubQuery: short }).success).toBe(false);
    expect(listAdminTrainersInput.safeParse({ clubQuery: long }).success).toBe(false);
    expect(listAdminTrainersInput.safeParse({ take: 51 }).success).toBe(false);
  });
});

describe('listAdminActionsInput', () => {
  it('accepts an action and a cuid club', () => {
    expect(
      listAdminActionsInput.safeParse({ action: 'CLUB_DEACTIVATED', clubId: ID_A }).success,
    ).toBe(true);
  });

  it('rejects an unknown action, a non-cuid club and take 51', () => {
    expect(listAdminActionsInput.safeParse({ action: 'CLUB_DELETED' }).success).toBe(false);
    expect(listAdminActionsInput.safeParse({ clubId: 'not-a-cuid' }).success).toBe(false);
    expect(listAdminActionsInput.safeParse({ take: 51 }).success).toBe(false);
  });
});

describe('insight outputs', () => {
  const outputs = {
    adminOverviewOutput,
    adminActionEntryOutput,
    adminActionListOutput,
    adminTrainerDirectoryEntryOutput,
    adminTrainerDirectoryListOutput,
  };

  it.each(Object.entries(outputs))('%s has no L2 keys and no Supabase id', (_name, schema) => {
    const keys = [...collectKeys(schema)];
    expect(keys.filter((k) => L2_KEY.test(k))).toEqual([]);
    expect(keys).not.toContain('supabaseUserId');
  });

  it('the action entry has no request id or actor ids', () => {
    for (const schema of [adminActionEntryOutput, adminActionListOutput]) {
      const keys = collectKeys(schema);
      expect(keys.has('requestId')).toBe(false);
      expect(keys.has('actorUserAccountId')).toBe(false);
      expect(keys.has('supabaseUserId')).toBe(false);
    }
  });

  it('the action details drop clubId and closedExpiredInvitationId', () => {
    const keys = collectKeys(adminActionEntryOutput);
    expect(keys.has('closedExpiredInvitationId')).toBe(false);
    const details = Object.keys(adminActionEntryOutput.shape.details.shape);
    expect(details).not.toContain('clubId');
  });

  it('the directory entry has access, no raw status and no user account id', () => {
    const keys = collectKeys(adminTrainerDirectoryListOutput);
    expect(keys.has('access')).toBe(true);
    expect(keys.has('status')).toBe(false);
    expect(keys.has('userAccountId')).toBe(false);
  });

  it('the overview has no athlete key', () => {
    const keys = [...collectKeys(adminOverviewOutput)];
    expect(keys.filter((k) => /athlete/i.test(k))).toEqual([]);
  });

  it('everything is exported from the index', () => {
    for (const name of [
      'adminOverviewOutput',
      'listAdminActionsInput',
      'adminActionEntryOutput',
      'adminActionListOutput',
      'listAdminTrainersInput',
      'adminTrainerDirectoryEntryOutput',
      'adminTrainerDirectoryListOutput',
      'adminTrainerAccessEnum',
    ]) {
      expect(index).toHaveProperty(name);
    }
  });
});
