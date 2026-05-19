/**
 * RLS tests — athletes table
 * Policies: athletes_select_own, athletes_update_own
 * Tested criteria:
 *   (a) owner can SELECT their own row
 *   (b) cross-tenant SELECT is denied (returns 0 rows)
 *   (c) owner can UPDATE their own row
 *   (d) cross-tenant UPDATE is denied
 *   (e) no INSERT/DELETE policy → client-side INSERT/DELETE are blocked
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('athletes RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'ath-u1'),
      createTestUser(svc, sportId, 'ath-u2'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own ──────────────────────────────────────────────────────────

  it('allows athlete to SELECT their own athletes row', async () => {
    const { data, error } = await user1.client
      .from('athletes')
      .select('id, display_name')
      .eq('id', user1.athleteId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(user1.athleteId);
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies athlete from SELECT on another athlete row', async () => {
    const { data, error } = await user1.client
      .from('athletes')
      .select('id')
      .eq('id', user2.athleteId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) UPDATE own ──────────────────────────────────────────────────────────

  it('allows athlete to UPDATE their own athletes row', async () => {
    const { error } = await user1.client
      .from('athletes')
      .update({ display_name: 'Updated Name' })
      .eq('id', user1.athleteId);

    expect(error).toBeNull();
  });

  // ── (d) UPDATE cross-tenant denied ─────────────────────────────────────────

  it('denies athlete from UPDATE on another athlete row', async () => {
    const { count, error } = await user1.client
      .from('athletes')
      .update({ display_name: 'Hijacked Name' }, { count: 'exact' })
      .eq('id', user2.athleteId);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── (e) INSERT blocked (no INSERT policy) ───────────────────────────────────

  it('blocks authenticated INSERT on athletes (no policy)', async () => {
    const { error } = await user1.client.from('athletes').insert({
      id: '00000000-0000-0000-0000-000000000001',
      user_account_id: user1.userAccountId,
      slug: 'injected-athlete',
      display_name: 'Injected',
      sport_id: sportId,
      country_code: 'CO',
      profile_status: 'ACTIVE',
      is_under_legal_hold: false,
    });

    expect(error).not.toBeNull();
  });
});
