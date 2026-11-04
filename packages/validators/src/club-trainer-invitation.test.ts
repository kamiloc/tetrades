import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  acceptTrainerInvitationOutput,
  adminClubTrainerListOutput,
  adminClubTrainerOutput,
  adminTrainerInvitationListOutput,
  adminTrainerInvitationOutput,
  inviteTrainerInput,
  inviteTrainerOutput,
  listClubTrainerInvitationsInput,
  listClubTrainersInput,
  myTrainerInvitationListOutput,
  myTrainerInvitationOutput,
  revokeClubTrainerOutput,
  trainerInvitationIdInput,
  trainerInvitationMutationOutput,
} from './club-trainer-invitation.js';

const ID_A = 'ckv9z0a1b0000qz8x1y2z3a4b';

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

describe('inviteTrainerInput', () => {
  it('trims and lowercases the email', () => {
    const parsed = inviteTrainerInput.parse({ clubId: ID_A, email: '  Ana.Restrepo@Club.CO ' });
    expect(parsed.email).toBe('ana.restrepo@club.co');
  });

  it('rejects a malformed email', () => {
    expect(inviteTrainerInput.safeParse({ clubId: ID_A, email: 'ana-at-club.co' }).success).toBe(
      false,
    );
    expect(inviteTrainerInput.safeParse({ clubId: ID_A, email: '' }).success).toBe(false);
  });

  it('rejects an email over 254 characters', () => {
    const long = `${'a'.repeat(250)}@x.co`;
    expect(inviteTrainerInput.safeParse({ clubId: ID_A, email: long }).success).toBe(false);
  });

  it('requires a cuid club id', () => {
    expect(inviteTrainerInput.safeParse({ clubId: 'nope', email: 'ana@club.co' }).success).toBe(
      false,
    );
  });
});

describe('id and list inputs', () => {
  it('trainerInvitationIdInput requires a cuid', () => {
    expect(trainerInvitationIdInput.safeParse({ invitationId: ID_A }).success).toBe(true);
    expect(trainerInvitationIdInput.safeParse({ invitationId: '123' }).success).toBe(false);
  });

  it('list inputs default to 20 and cap at 50', () => {
    for (const schema of [listClubTrainersInput, listClubTrainerInvitationsInput]) {
      expect(schema.parse({ clubId: ID_A }).take).toBe(20);
      expect(schema.safeParse({ clubId: ID_A, take: 51 }).success).toBe(false);
    }
  });
});

describe('outputs', () => {
  const outputs = {
    adminClubTrainerOutput,
    adminClubTrainerListOutput,
    adminTrainerInvitationOutput,
    adminTrainerInvitationListOutput,
    inviteTrainerOutput,
    myTrainerInvitationOutput,
    myTrainerInvitationListOutput,
    trainerInvitationMutationOutput,
    acceptTrainerInvitationOutput,
    revokeClubTrainerOutput,
  };

  it.each(Object.entries(outputs))('%s has no L2 keys and no Supabase id', (_name, schema) => {
    const keys = [...collectKeys(schema)];
    expect(keys.filter((k) => L2_KEY.test(k))).toEqual([]);
    expect(keys).not.toContain('supabaseUserId');
  });

  it('no output exposes the inviting or accepting account ids', () => {
    for (const schema of Object.values(outputs)) {
      const keys = collectKeys(schema);
      expect(keys.has('invitedByUserAccountId')).toBe(false);
      expect(keys.has('acceptedByUserAccountId')).toBe(false);
      expect(keys.has('userAccountId')).toBe(false);
    }
  });

  it('the invitee row carries the club L0 fields and the expiry', () => {
    expect(Object.keys(myTrainerInvitationOutput.shape).sort()).toEqual([
      'club',
      'expiresAt',
      'id',
    ]);
  });

  it('inviteTrainerOutput carries the expiry', () => {
    expect(Object.keys(inviteTrainerOutput.shape)).toContain('expiresAt');
  });

  it('the admin trainer row allows a null invited email', () => {
    expect(
      adminClubTrainerOutput.safeParse({
        id: ID_A,
        status: 'ACTIVE',
        createdAt: new Date(),
        revokedAt: null,
        invitedEmail: null,
      }).success,
    ).toBe(true);
  });

  it('the admin invitation row accepts the derived EXPIRED state', () => {
    expect(
      adminTrainerInvitationOutput.safeParse({
        id: ID_A,
        email: 'ana@club.co',
        state: 'EXPIRED',
        expiresAt: new Date(),
        respondedAt: null,
        createdAt: new Date(),
      }).success,
    ).toBe(true);
  });
});
