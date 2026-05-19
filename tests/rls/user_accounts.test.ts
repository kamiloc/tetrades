/**
 * RLS tests — user_accounts table
 * Policy: user_accounts_select_own  (USING supabase_user_id = auth.uid()::text)
 *
 * Tested criteria:
 *   (a) user can SELECT their own user_accounts row
 *   (b) cross-tenant SELECT is denied (returns 0 rows)
 *   (c) authenticated INSERT is blocked (service_role / onboarding only)
 *   (d) authenticated UPDATE is blocked (service_role only)
 *   (e) authenticated DELETE is blocked (service_role deletePII job only)
 *
 * NULL-safety note: supabase_user_id is NOT NULL (@unique in Prisma).
 * auth.uid() is NULL only for the anon role, which is not granted this policy.
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
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('user_accounts RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'ua-u1'),
      createTestUser(svc, sportId, 'ua-u2'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own ──────────────────────────────────────────────────────────

  it('allows user to SELECT their own user_accounts row', async () => {
    const { data, error } = await user1.client
      .from('user_accounts')
      .select('id, role, status')
      .eq('id', user1.userAccountId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(user1.userAccountId);
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies user from SELECT on another user account row', async () => {
    const { data, error } = await user1.client
      .from('user_accounts')
      .select('id')
      .eq('id', user2.userAccountId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) INSERT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated INSERT on user_accounts', async () => {
    const { error } = await user1.client.from('user_accounts').insert({
      id: randomUUID(),
      supabase_user_id: randomUUID(),
      role: 'ATHLETE',
      status: 'ACTIVE',
    });

    expect(error).not.toBeNull();
  });

  // ── (d) UPDATE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated UPDATE on user_accounts (including own row)', async () => {
    const { count } = await user1.client
      .from('user_accounts')
      .update({ status: 'SUSPENDED' }, { count: 'exact' })
      .eq('id', user1.userAccountId);

    expect(count).toBe(0);
  });

  // ── (e) DELETE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated DELETE on user_accounts', async () => {
    const { count } = await user1.client
      .from('user_accounts')
      .delete({ count: 'exact' })
      .eq('id', user1.userAccountId);

    expect(count).toBe(0);
  });
});
