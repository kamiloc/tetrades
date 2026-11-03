import { describe, expect, it } from 'vitest';

import {
  adminClubOutput,
  clubPublicOutput,
  createClubInput,
  deactivateClubOutput,
  listAdminClubsInput,
  updateClubInput,
} from './club.js';

const ID_A = 'ckv9z0a1b0000qz8x1y2z3a4b';

describe('createClubInput', () => {
  it('accepts a valid club and uppercases the country', () => {
    const parsed = createClubInput.parse({
      slug: 'liga-antioquena-de-atletismo',
      name: 'Liga Antioqueña de Atletismo',
      countryCode: 'co',
      city: 'Medellín',
    });
    expect(parsed.countryCode).toBe('CO');
  });

  it('rejects a missing name, an invalid slug and an invalid country', () => {
    expect(createClubInput.safeParse({ slug: 'club-ok', countryCode: 'CO' }).success).toBe(false);
    expect(
      createClubInput.safeParse({ slug: 'Club Bad', name: 'Club', countryCode: 'CO' }).success,
    ).toBe(false);
    expect(
      createClubInput.safeParse({ slug: 'club-ok', name: 'Club', countryCode: 'COL' }).success,
    ).toBe(false);
  });
});

describe('updateClubInput', () => {
  it('accepts a name and city change', () => {
    expect(
      updateClubInput.safeParse({ clubId: ID_A, name: 'Club Atlético Cali', city: 'Cali' }).success,
    ).toBe(true);
  });

  it('rejects a slug key, so the slug can never change', () => {
    expect(updateClubInput.safeParse({ clubId: ID_A, slug: 'nuevo-slug' }).success).toBe(false);
  });

  it('rejects any other unknown key', () => {
    expect(updateClubInput.safeParse({ clubId: ID_A, deactivatedAt: null }).success).toBe(false);
  });
});

describe('listAdminClubsInput', () => {
  it('defaults to 20 rows and every status', () => {
    expect(listAdminClubsInput.parse({})).toEqual({ take: 20, status: 'ALL' });
  });

  it('caps take at 50', () => {
    expect(listAdminClubsInput.safeParse({ take: 50 }).success).toBe(true);
    expect(listAdminClubsInput.safeParse({ take: 51 }).success).toBe(false);
  });

  it('rejects an unknown status filter', () => {
    expect(listAdminClubsInput.safeParse({ status: 'DELETED' }).success).toBe(false);
  });
});

describe('club outputs', () => {
  it('clubPublicOutput has isActive and neither timestamp', () => {
    const keys = Object.keys(clubPublicOutput.shape);
    expect(keys).toContain('isActive');
    expect(keys).not.toContain('deactivatedAt');
    expect(keys).not.toContain('createdAt');
  });

  it('adminClubOutput carries the timestamps and the active trainer count', () => {
    expect(Object.keys(adminClubOutput.shape)).toEqual(
      expect.arrayContaining(['deactivatedAt', 'createdAt', 'isActive', 'activeTrainerCount']),
    );
  });

  it('deactivateClubOutput reports the three cancelled counts', () => {
    expect(Object.keys(deactivateClubOutput.shape).sort()).toEqual([
      'cancelledCertificationRequests',
      'club',
      'rejectedMembershipInvitations',
      'revokedTrainerInvitations',
    ]);
  });
});
