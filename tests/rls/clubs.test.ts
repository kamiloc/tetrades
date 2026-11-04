/**
 * RLS tests — clubs table
 * Policies:
 *   clubs_select_public (anon + authenticated, TRUE)
 *   column grants: SELECT (id, slug, name, country_code, city) only
 *   (no INSERT / UPDATE / DELETE policy — service_role only)
 *
 * Tested criteria:
 *   (a) anon can SELECT a club
 *   (b) two distinct authenticated users can both SELECT the same club
 *   (c) NULL city does not affect visibility
 *   (d) authenticated INSERT is denied
 *   (e) authenticated UPDATE affects 0 rows
 *   (f) authenticated DELETE affects 0 rows
 *   (g) column grants (ADR-017): anon and authenticated read the five L0
 *       columns, and get a permission error for deactivated_at or created_at
 *   (h) a deactivated club stays readable (rows are public)
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestClub,
  cleanupTestUser,
  createTestClub,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  setTestClubActive,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('clubs RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let clubId: string;
  let noCityClubId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'clubs-u1'),
      createTestUser(svc, sportId, 'clubs-u2'),
    ]);
    clubId = await createTestClub(svc, 'clubs');
    noCityClubId = await createTestClub(svc, 'clubs-nocity');
    await svc.from('clubs').update({ city: null }).eq('id', noCityClubId);
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubId);
    await cleanupTestClub(svc, noCityClubId);
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  it('(a) allows anon to SELECT a club', async () => {
    const { data, error } = await getAnonClient().from('clubs').select('id').eq('id', clubId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(b) allows two distinct users to SELECT the same club', async () => {
    for (const user of [user1, user2]) {
      const { data, error } = await user.client.from('clubs').select('id').eq('id', clubId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it('(c) returns a club whose city is NULL', async () => {
    const { data, error } = await user1.client
      .from('clubs')
      .select('id, city')
      .eq('id', noCityClubId);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: noCityClubId, city: null }]);
  });

  it('(d) denies authenticated INSERT', async () => {
    const id = randomUUID();
    const { error } = await user1.client.from('clubs').insert({
      id,
      slug: `rls-club-forged-${id.slice(0, 8)}`,
      name: 'Club Forjado',
      country_code: 'CO',
    });
    expect(error).not.toBeNull();
  });

  it('(e) authenticated UPDATE affects 0 rows', async () => {
    const { count, error } = await user1.client
      .from('clubs')
      .update({ name: 'Renamed' }, { count: 'exact' })
      .eq('id', clubId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(f) authenticated DELETE affects 0 rows', async () => {
    const { count, error } = await user2.client
      .from('clubs')
      .delete({ count: 'exact' })
      .eq('id', clubId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── Column grants (ADR-017) ─────────────────────────────────────────────────

  const L0_COLUMNS = 'id, slug, name, country_code, city';

  it('(g1) lets anon and authenticated select the five L0 columns', async () => {
    for (const client of [getAnonClient(), user1.client]) {
      const { data, error } = await client.from('clubs').select(L0_COLUMNS).eq('id', clubId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it.each(['deactivated_at', 'created_at', '*'])(
    '(g2) denies anon and authenticated selecting %s',
    async (column) => {
      for (const client of [getAnonClient(), user1.client]) {
        const { data, error } = await client.from('clubs').select(column).eq('id', clubId);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('42501'); // insufficient_privilege
        expect(data).toBeNull();
      }
    },
  );

  it('(g3) denies filtering on deactivated_at from a client', async () => {
    const { error } = await user1.client
      .from('clubs')
      .select('id')
      .is('deactivated_at', null);
    expect(error?.code).toBe('42501');
  });

  it('(h) keeps a deactivated club readable through the L0 columns', async () => {
    await setTestClubActive(svc, noCityClubId, false);
    try {
      const { data, error } = await getAnonClient()
        .from('clubs')
        .select('id')
        .eq('id', noCityClubId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    } finally {
      await setTestClubActive(svc, noCityClubId, true);
    }
  });
});
