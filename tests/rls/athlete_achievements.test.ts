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
 *   (g2) owner can DELETE an achievement with certification history; its
 *        requests are removed with it (ON DELETE CASCADE)
 * Integrity trigger (supabase/constraints/achievement_verification_integrity.sql):
 *   (h) owner cannot INSERT an achievement as VERIFIED or with a source
 *   (i) owner cannot UPDATE verification_status or verification_source
 *   (j) editing the title / organization / date of a VERIFIED row keeps the
 *       edit and resets the row to UNVERIFIED
 *   (k) service_role (the API's certification flow) can still set VERIFIED
 *   (l) the title / organization / date of a PENDING row (under trainer
 *       review) cannot be edited by the owner
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addClubTrainer,
  cleanupTestClub,
  cleanupTestUser,
  createTestAchievement,
  createTestCertificationRequest,
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
  let clubTrainerId: string;
  let membershipId: string;
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
    clubTrainerId = await addClubTrainer(svc, clubId, trainer);
    membershipId = await createTestMembership(svc, {
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

  // ── (g2) DELETE with certification history ─────────────────────────────────

  it('(g2) lets the owner DELETE an achievement whose request was rejected', async () => {
    const id = await createTestAchievement(svc, user1.athleteId);
    const requestId = await createTestCertificationRequest(svc, {
      achievementId: id,
      clubId,
      clubMembershipId: membershipId,
      status: 'REJECTED',
      deciderRowId: clubTrainerId,
    });

    const { count, error } = await user1.client
      .from('athlete_achievements')
      .delete({ count: 'exact' })
      .eq('id', id);
    expect(error).toBeNull();
    expect(count).toBe(1);

    const { data } = await svc
      .from('achievement_certification_requests')
      .select('id')
      .eq('id', requestId);
    expect(data).toEqual([]);
  });

  // ── (h)–(l) verification integrity trigger ─────────────────────────────────

  const statusOf = async (id: string) => {
    const { data } = await svc
      .from('athlete_achievements')
      .select('verification_status, verification_source, title')
      .eq('id', id)
      .single();
    return data as {
      verification_status: string;
      verification_source: string | null;
      title: string;
    };
  };

  it('(h) rejects an owner INSERT that starts VERIFIED or carries a source', async () => {
    const extras = [
      { verification_status: 'VERIFIED' },
      { verification_status: 'PENDING' },
      { verification_source: 'Planilla oficial' },
    ];
    for (const extra of extras) {
      const { error } = await user1.client.from('athlete_achievements').insert({
        id: randomUUID(),
        athlete_id: user1.athleteId,
        title: 'Self-verified medal',
        organization: 'Test Org',
        achieved_on: '2024-03-01',
        ...extra,
      });
      expect(error).not.toBeNull();
    }
  });

  it('(i) rejects an owner UPDATE of verification_status or verification_source', async () => {
    const id = await createTestAchievement(svc, user1.athleteId);
    const changes = [
      { verification_status: 'VERIFIED' },
      { verification_source: 'Planilla oficial' },
    ];
    for (const change of changes) {
      const { error } = await user1.client.from('athlete_achievements').update(change).eq('id', id);
      expect(error).not.toBeNull();
    }
    expect(await statusOf(id)).toMatchObject({
      verification_status: 'UNVERIFIED',
      verification_source: null,
    });
    await svc.from('athlete_achievements').delete().eq('id', id);
  });

  it('(j) keeps an edit to a VERIFIED achievement and resets it to UNVERIFIED', async () => {
    const id = await createTestAchievement(svc, user1.athleteId, 'VERIFIED');
    const { error } = await user1.client
      .from('athlete_achievements')
      .update({ title: 'Campeonato Nacional (editado)' })
      .eq('id', id);
    expect(error).toBeNull();
    expect(await statusOf(id)).toMatchObject({
      title: 'Campeonato Nacional (editado)',
      verification_status: 'UNVERIFIED',
    });
    await svc.from('athlete_achievements').delete().eq('id', id);
  });

  it('(k) lets service_role set VERIFIED (the API certification flow)', async () => {
    const id = await createTestAchievement(svc, user1.athleteId);
    const { error } = await svc
      .from('athlete_achievements')
      .update({ verification_status: 'VERIFIED' })
      .eq('id', id);
    expect(error).toBeNull();
    expect((await statusOf(id)).verification_status).toBe('VERIFIED');
    await svc.from('athlete_achievements').delete().eq('id', id);
  });

  it('(l) rejects an owner edit of a PENDING achievement under review', async () => {
    const id = await createTestAchievement(svc, user1.athleteId, 'PENDING');
    const { title } = await statusOf(id);
    const edits = [
      { title: 'Oro Suramericano' },
      { organization: 'Otra Federación' },
      { achieved_on: '2023-01-01' },
    ];
    for (const edit of edits) {
      const { error } = await user1.client.from('athlete_achievements').update(edit).eq('id', id);
      expect(error).not.toBeNull();
    }
    expect(await statusOf(id)).toMatchObject({
      title,
      verification_status: 'PENDING',
    });
    await svc.from('athlete_achievements').delete().eq('id', id);
  });
});
