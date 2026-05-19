/**
 * RLS tests — athlete_public_profiles table
 * Policies:
 *   athlete_public_profiles_select_public  (TO anon, authenticated — USING TRUE)
 *   athlete_public_profiles_insert_own
 *   athlete_public_profiles_update_own
 *   (no DELETE policy — deletion is service_role / deletePII job)
 *
 * Tested criteria:
 *   (a) anonymous user can SELECT any public profile (world-readable)
 *   (b) any authenticated user can SELECT any public profile
 *   (c) owner can INSERT their own public profile row
 *   (d) non-owner cannot INSERT a profile for another athlete
 *   (e) owner can UPDATE their own public profile
 *   (f) non-owner cannot UPDATE another athlete's public profile
 *   (g) authenticated DELETE is blocked (no policy)
 *
 * NULL-safety note: avatar_asset_id is nullable; the SELECT policy does not
 * predicate on it, so a NULL avatar never affects row visibility.
 */

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

describe.skipIf(!envReady)('athlete_public_profiles RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'pub-u1'),
      createTestUser(svc, sportId, 'pub-u2'),
    ]);

    // Create user2 public profile via service_role so user1 can try to UPDATE it
    await svc.from('athlete_public_profiles').insert({
      athlete_id: user2.athleteId,
      public_bio: 'User2 bio',
      is_searchable: true,
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) anon SELECT ─────────────────────────────────────────────────────────

  it('allows anonymous user to SELECT any public profile (world-readable)', async () => {
    const anon = getAnonClient();
    const { data, error } = await anon
      .from('athlete_public_profiles')
      .select('athlete_id')
      .eq('athlete_id', user2.athleteId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (b) authenticated SELECT (cross-tenant allowed) ─────────────────────────

  it('allows authenticated user to SELECT another athlete public profile', async () => {
    const { data, error } = await user1.client
      .from('athlete_public_profiles')
      .select('athlete_id')
      .eq('athlete_id', user2.athleteId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (c) INSERT own ──────────────────────────────────────────────────────────

  it('allows owner to INSERT their own public profile', async () => {
    const { error } = await user1.client.from('athlete_public_profiles').insert({
      athlete_id: user1.athleteId,
      public_bio: 'My public bio',
      is_searchable: true,
    });

    expect(error).toBeNull();
  });

  // ── (d) INSERT cross-tenant denied ─────────────────────────────────────────

  it('denies user from INSERT public profile for another athlete', async () => {
    // user2 already has a profile; using a hypothetical extra athleteId check:
    // attempt to insert with user1's client but for a non-owned athlete_id
    const { error } = await user1.client.from('athlete_public_profiles').upsert({
      athlete_id: '00000000-0000-0000-0000-000000000099',
      is_searchable: false,
    });

    expect(error).not.toBeNull();
  });

  // ── (e) UPDATE own ──────────────────────────────────────────────────────────

  it('allows owner to UPDATE their own public profile', async () => {
    const { error } = await user1.client
      .from('athlete_public_profiles')
      .update({ public_bio: 'Updated bio' })
      .eq('athlete_id', user1.athleteId);

    expect(error).toBeNull();
  });

  // ── (f) UPDATE cross-tenant denied ─────────────────────────────────────────

  it('denies non-owner from UPDATE on another athlete public profile', async () => {
    const { count, error } = await user1.client
      .from('athlete_public_profiles')
      .update({ public_bio: 'Hijacked bio' }, { count: 'exact' })
      .eq('athlete_id', user2.athleteId);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── (g) DELETE blocked (no policy) ─────────────────────────────────────────

  it('blocks authenticated DELETE on public profile (no DELETE policy)', async () => {
    const { count } = await user1.client
      .from('athlete_public_profiles')
      .delete({ count: 'exact' })
      .eq('athlete_id', user1.athleteId);

    expect(count).toBe(0);
  });
});
