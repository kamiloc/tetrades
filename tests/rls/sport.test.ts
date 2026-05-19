/**
 * RLS tests — sports table
 * Policy: sport_select_public  (TO anon, authenticated — USING TRUE)
 * No INSERT / UPDATE / DELETE policies (service_role catalog mutations only).
 *
 * Tested criteria:
 *   (a) anonymous user can SELECT sports (public taxonomy)
 *   (b) any authenticated user can SELECT sports
 *   (c) authenticated INSERT is blocked (catalog is service_role only)
 *   (d) authenticated UPDATE is blocked
 *   (e) authenticated DELETE is blocked
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('sports RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    user1 = await createTestUser(svc, sportId, 'sport-u1');
  });

  afterAll(async () => {
    await cleanupTestUser(svc, user1);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) anon SELECT ─────────────────────────────────────────────────────────

  it('allows anonymous user to SELECT from sports (public taxonomy)', async () => {
    const anon = getAnonClient();
    const { data, error } = await anon
      .from('sports')
      .select('id, name')
      .eq('id', sportId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (b) authenticated SELECT ─────────────────────────────────────────────────

  it('allows authenticated user to SELECT from sports', async () => {
    const { data, error } = await user1.client
      .from('sports')
      .select('id, name')
      .eq('id', sportId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (c) INSERT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated INSERT on sports (service_role catalog only)', async () => {
    const { error } = await user1.client.from('sports').insert({
      id: randomUUID(),
      name: `Injected Sport ${randomUUID()}`,
      category: 'TEAM',
      is_active: true,
    });

    expect(error).not.toBeNull();
  });

  // ── (d) UPDATE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated UPDATE on sports', async () => {
    const { count } = await user1.client
      .from('sports')
      .update({ name: 'Tampered Name' }, { count: 'exact' })
      .eq('id', sportId);

    expect(count).toBe(0);
  });

  // ── (e) DELETE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated DELETE on sports', async () => {
    const { count } = await user1.client
      .from('sports')
      .delete({ count: 'exact' })
      .eq('id', sportId);

    expect(count).toBe(0);
  });
});
