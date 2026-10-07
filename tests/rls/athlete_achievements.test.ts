/**
 * RLS tests — athlete_achievements table
 * Policies:
 *   athlete_achievements_select_own  (owner only; audiences are served by the API)
 *   athlete_achievements_insert_own
 *   athlete_achievements_update_own
 *   athlete_achievements_delete_own
 *
 * Tested criteria:
 *   (a) owner can SELECT their own achievements; a different athlete, an
 *       ACCEPTED connection, a trainer of the owner's ACTIVE club, and an
 *       anonymous caller all read 0 rows, even for a VERIFIED achievement
 *   (a2) NULL athlete_id is rejected on INSERT
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
  addClubTrainer,
  cleanupTestClub,
  cleanupTestUser,
  createTestClub,
  createTestMembership,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('athlete_achievements RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let friend: TestUser;
  let trainer: TestUser;
  let clubId: string;
  let achievementUser1Id: string;
  let verifiedUser1Id: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2, friend, trainer] = await Promise.all([
      createTestUser(svc, sportId, 'ach-u1'),
      createTestUser(svc, sportId, 'ach-u2'),
      createTestUser(svc, sportId, 'ach-friend'),
      createTestUser(svc, sportId, 'ach-trainer'),
    ]);

    const { error: connErr } = await svc.from('athlete_connections').insert({
      id: randomUUID(),
      requester_id: user1.athleteId,
      addressee_id: friend.athleteId,
      status: 'ACCEPTED',
    });
    if (connErr) throw new Error(`connection fixture: ${connErr.message}`);

    clubId = await createTestClub(svc, 'ach-club');
    const clubTrainerId = await addClubTrainer(svc, clubId, trainer);
    await createTestMembership(svc, {
      clubId,
      athleteId: user1.athleteId,
      clubTrainerId,
      status: 'ACTIVE',
    });

    verifiedUser1Id = randomUUID();
    const { error: verErr } = await svc.from('athlete_achievements').insert({
      id: verifiedUser1Id,
      athlete_id: user1.athleteId,
      title: 'Oro Juegos Bolivarianos',
      organization: 'ODEBO',
      achieved_on: '2025-11-30',
      verification_status: 'VERIFIED',
    });
    if (verErr) throw new Error(`verified achievement fixture: ${verErr.message}`);

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
    await cleanupTestClub(svc, clubId);
    await Promise.all(
      [user1, user2, friend, trainer].map((user) => cleanupTestUser(svc, user)),
    );
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own only ────────────────────────────────────────────────────

  const visibleIds = async (client: TestUser['client'] | ReturnType<typeof getAnonClient>) => {
    const { data, error } = await client
      .from('athlete_achievements')
      .select('id')
      .in('id', [achievementUser1Id, verifiedUser1Id]);
    expect(error).toBeNull();
    return (data ?? []).map((row: { id: string }) => row.id).sort();
  };

  it('allows the owner to SELECT their own achievements in every status', async () => {
    expect(await visibleIds(user1.client)).toEqual([achievementUser1Id, verifiedUser1Id].sort());
  });

  it('denies a different athlete, even for a VERIFIED achievement', async () => {
    expect(await visibleIds(user2.client)).toEqual([]);
  });

  it('denies an ACCEPTED connection (audiences are served by the API, not RLS)', async () => {
    expect(await visibleIds(friend.client)).toEqual([]);
  });

  it("denies a trainer of the owner's ACTIVE club", async () => {
    expect(await visibleIds(trainer.client)).toEqual([]);
  });

  it('denies an anonymous caller', async () => {
    expect(await visibleIds(getAnonClient())).toEqual([]);
  });

  // ── (a2) NULL athlete_id ────────────────────────────────────────────────────

  it('rejects an INSERT with a NULL athlete_id', async () => {
    const { error } = await user1.client.from('athlete_achievements').insert({
      id: randomUUID(),
      athlete_id: null,
      title: 'Sin atleta',
      organization: 'Test Org',
      achieved_on: '2024-03-01',
    });
    expect(error).not.toBeNull();
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
