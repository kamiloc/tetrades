/**
 * RLS tests — athlete_achievements table
 * Policies:
 *   athlete_achievements_select_authenticated  (USING TRUE for all authenticated)
 *   athlete_achievements_insert_own
 *   athlete_achievements_update_own
 *   athlete_achievements_delete_own
 *
 * Tested criteria:
 *   (a) any authenticated user can SELECT achievements across the network
 *   (b) owner can INSERT their own achievement
 *   (c) non-owner cannot INSERT achievement for another athlete
 *   (d) owner can UPDATE their own achievement
 *   (e) non-owner cannot UPDATE another athlete's achievement
 *   (f) owner can DELETE their own achievement
 *   (g) non-owner cannot DELETE another athlete's achievement
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

describe.skipIf(!envReady)('athlete_achievements RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let achievementUser1Id: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'ach-u1'),
      createTestUser(svc, sportId, 'ach-u2'),
    ]);

    achievementUser1Id = randomUUID();
    await svc.from('athlete_achievements').insert({
      id: achievementUser1Id,
      athlete_id: user1.athleteId,
      title: 'RLS Test Medal',
      organization: 'RLS Test Federation',
      achieved_on: '2024-01-15',
      verification_status: 'UNVERIFIED',
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT authenticated (any user can read) ────────────────────────────

  it('allows any authenticated user to SELECT achievements (USING TRUE)', async () => {
    const { data, error } = await user2.client
      .from('athlete_achievements')
      .select('id')
      .eq('id', achievementUser1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (b) INSERT own ──────────────────────────────────────────────────────────

  it('allows owner to INSERT their own achievement', async () => {
    const newId = randomUUID();
    const { error } = await user1.client.from('athlete_achievements').insert({
      id: newId,
      athlete_id: user1.athleteId,
      title: 'Inserted by Owner',
      organization: 'Test Org',
      achieved_on: '2024-03-01',
    });

    expect(error).toBeNull();
    await svc.from('athlete_achievements').delete().eq('id', newId);
  });

  // ── (c) INSERT cross-tenant denied ─────────────────────────────────────────

  it('denies user from INSERT achievement for another athlete', async () => {
    const { error } = await user1.client.from('athlete_achievements').insert({
      id: randomUUID(),
      athlete_id: user2.athleteId,
      title: 'Fake Medal',
      organization: 'Fake Org',
      achieved_on: '2024-03-01',
    });

    expect(error).not.toBeNull();
  });

  // ── (d) UPDATE own ──────────────────────────────────────────────────────────

  it('allows owner to UPDATE their own achievement', async () => {
    const { error } = await user1.client
      .from('athlete_achievements')
      .update({ title: 'Updated Title' })
      .eq('id', achievementUser1Id);

    expect(error).toBeNull();
  });

  // ── (e) UPDATE cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from UPDATE on another athlete achievement', async () => {
    const { count, error } = await user2.client
      .from('athlete_achievements')
      .update({ title: 'Tampered Title' }, { count: 'exact' })
      .eq('id', achievementUser1Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── (f) DELETE own ──────────────────────────────────────────────────────────

  it('allows owner to DELETE their own achievement', async () => {
    const deleteId = randomUUID();
    await svc.from('athlete_achievements').insert({
      id: deleteId,
      athlete_id: user1.athleteId,
      title: 'To Be Deleted',
      organization: 'Test Org',
      achieved_on: '2024-01-01',
    });

    const { error } = await user1.client
      .from('athlete_achievements')
      .delete()
      .eq('id', deleteId);

    expect(error).toBeNull();
  });

  // ── (g) DELETE cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from DELETE on another athlete achievement', async () => {
    const { count, error } = await user2.client
      .from('athlete_achievements')
      .delete({ count: 'exact' })
      .eq('id', achievementUser1Id);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
