/**
 * RLS tests — athletes table
 * Policies: athletes_select_own, athletes_update_own
 * Tested criteria:
 *   (a) owner can SELECT their own row
 *   (b) cross-tenant SELECT is denied (returns 0 rows)
 *   (c) owner can UPDATE their own row
 *   (d) cross-tenant UPDATE is denied
 *   (e) no INSERT/DELETE policy → client-side INSERT/DELETE are blocked
 *   (f) one capacity per account: no athletes row for a trainer or ADMIN account
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getServiceClient,
  setTestTrainerRevoked,
  createTrainerUser,
  createTestClub,
  createAdminUser,
  cleanupTestClub,
  addClubTrainer,
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
      updated_at: new Date().toISOString(),
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

  // ── One capacity per account (ADR-017, account_single_capacity.sql) ─────────

  const athleteRow = (userAccountId: string) => {
    const id = randomUUID();
    return {
      updated_at: new Date().toISOString(),
      id,
      user_account_id: userAccountId,
      slug: `rls-capacity-${id.slice(0, 8)}`,
      display_name: 'Valentina Ospina',
      sport_id: sportId,
      country_code: 'CO',
      profile_status: 'ACTIVE',
      is_under_legal_hold: false,
    };
  };

  it('(f) rejects an athletes row for an account with a trainer row, even revoked', async () => {
    const trainer = await createTrainerUser(svc, 'ath-tr');
    const clubId = await createTestClub(svc, 'ath-cap');
    try {
      const rowId = await addClubTrainer(svc, clubId, trainer);
      const first = await svc.from('athletes').insert(athleteRow(trainer.userAccountId));
      expect(first.error).not.toBeNull();
      expect(first.error?.message).toContain('club trainer account cannot have an athlete profile');

      await setTestTrainerRevoked(svc, rowId, true);
      const revoked = await svc.from('athletes').insert(athleteRow(trainer.userAccountId));
      expect(revoked.error).not.toBeNull();
    } finally {
      await cleanupTestClub(svc, clubId);
      await cleanupTestUser(svc, trainer);
    }
  });

  it('(f) rejects an athletes row for an ADMIN account', async () => {
    const admin = await createAdminUser(svc, 'ath-admin');
    try {
      const { error } = await svc.from('athletes').insert(athleteRow(admin.userAccountId));
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Only an ATHLETE account can have an athlete profile');
    } finally {
      await cleanupTestUser(svc, admin);
    }
  });
});
