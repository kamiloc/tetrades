/**
 * RLS tests — athlete_connections table
 * Policies:
 *   athlete_connections_select_parties   (requester OR addressee)
 *   athlete_connections_insert_requester (requester must be the caller)
 *   athlete_connections_update_parties   (either party)
 *   athlete_connections_delete_parties   (either party)
 *
 * Tested criteria:
 *   (a) requester can SELECT the connection row
 *   (b) addressee can SELECT the connection row
 *   (c) unrelated third party is denied SELECT
 *   (d) user can INSERT with themselves as requester
 *   (e) user cannot INSERT with another user as requester (spoofing)
 *   (f) addressee can UPDATE (e.g. accept/decline)
 *   (g) unrelated user cannot UPDATE the connection
 *   (h) requester can DELETE the connection
 *   (i) unrelated user cannot DELETE the connection
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

describe.skipIf(!envReady)('athlete_connections RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser; // requester
  let user2: TestUser; // addressee
  let user3: TestUser; // unrelated third party
  let connectionId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2, user3] = await Promise.all([
      createTestUser(svc, sportId, 'conn-u1'),
      createTestUser(svc, sportId, 'conn-u2'),
      createTestUser(svc, sportId, 'conn-u3'),
    ]);

    connectionId = randomUUID();
    await svc.from('athlete_connections').insert({
      id: connectionId,
      requester_id: user1.athleteId,
      addressee_id: user2.athleteId,
      status: 'PENDING',
    });
  });

  afterAll(async () => {
    await svc.from('athlete_connections').delete().eq('id', connectionId);
    await Promise.all([
      cleanupTestUser(svc, user1),
      cleanupTestUser(svc, user2),
      cleanupTestUser(svc, user3),
    ]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) requester can SELECT ────────────────────────────────────────────────

  it('allows requester (user1) to SELECT the connection row', async () => {
    const { data, error } = await user1.client
      .from('athlete_connections')
      .select('id')
      .eq('id', connectionId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (b) addressee can SELECT ────────────────────────────────────────────────

  it('allows addressee (user2) to SELECT the connection row', async () => {
    const { data, error } = await user2.client
      .from('athlete_connections')
      .select('id')
      .eq('id', connectionId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (c) unrelated party is denied SELECT ───────────────────────────────────

  it('denies third-party (user3) from SELECT on connection between user1 and user2', async () => {
    const { data, error } = await user3.client
      .from('athlete_connections')
      .select('id')
      .eq('id', connectionId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (d) INSERT with self as requester ──────────────────────────────────────

  it('allows user to INSERT connection request as themselves', async () => {
    const newId = randomUUID();
    const { error } = await user1.client.from('athlete_connections').insert({
      id: newId,
      requester_id: user1.athleteId,
      addressee_id: user3.athleteId,
      status: 'PENDING',
    });

    expect(error).toBeNull();
    await svc.from('athlete_connections').delete().eq('id', newId);
  });

  // ── (e) INSERT spoofing another requester is denied ────────────────────────

  it('denies user from INSERT with another athlete as requester', async () => {
    const { error } = await user1.client.from('athlete_connections').insert({
      id: randomUUID(),
      requester_id: user2.athleteId, // spoofed — user2 is not auth.uid()
      addressee_id: user3.athleteId,
      status: 'PENDING',
    });

    expect(error).not.toBeNull();
  });

  // ── (f) addressee can UPDATE ────────────────────────────────────────────────

  it('allows addressee (user2) to UPDATE the connection (e.g. accept)', async () => {
    const { error } = await user2.client
      .from('athlete_connections')
      .update({ status: 'ACCEPTED' })
      .eq('id', connectionId);

    expect(error).toBeNull();
  });

  // ── (g) unrelated user cannot UPDATE ──────────────────────────────────────

  it('denies third-party (user3) from UPDATE on connection between user1 and user2', async () => {
    const { count, error } = await user3.client
      .from('athlete_connections')
      .update({ status: 'DECLINED' }, { count: 'exact' })
      .eq('id', connectionId);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  // ── (h) requester can DELETE ────────────────────────────────────────────────

  it('allows requester (user1) to DELETE the connection', async () => {
    const delId = randomUUID();
    await svc.from('athlete_connections').insert({
      id: delId,
      requester_id: user1.athleteId,
      addressee_id: user3.athleteId,
      status: 'PENDING',
    });

    const { error } = await user1.client
      .from('athlete_connections')
      .delete()
      .eq('id', delId);

    expect(error).toBeNull();
  });

  // ── (i) unrelated user cannot DELETE ──────────────────────────────────────

  it('denies third-party (user3) from DELETE on user1-user2 connection', async () => {
    const { count, error } = await user3.client
      .from('athlete_connections')
      .delete({ count: 'exact' })
      .eq('id', connectionId);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
