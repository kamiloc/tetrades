/**
 * RLS tests — data_lifecycle_requests table
 * Policies:
 *   data_lifecycle_requests_select_own
 *   data_lifecycle_requests_insert_own
 *   (no UPDATE policy — status transitions are service_role background jobs)
 *   (no DELETE policy — 5-year retention per CLAUDE.md)
 *
 * Tested criteria:
 *   (a) athlete can SELECT their own lifecycle requests
 *   (b) cross-tenant SELECT is denied
 *   (c) athlete can INSERT their own lifecycle request (Habeas Data right)
 *   (d) athlete cannot INSERT request for another athlete
 *   (e) authenticated UPDATE is blocked (service_role only)
 *   (f) authenticated DELETE is blocked (retention policy)
 *
 * Note: RLS WITH CHECK pins athlete_id to the caller's own athlete.
 * The requested_by field is enforced by the API layer (not RLS).
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

describe.skipIf(!envReady)('data_lifecycle_requests RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let reqUser1Id: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'dlr-u1'),
      createTestUser(svc, sportId, 'dlr-u2'),
    ]);

    // Create a lifecycle request for user1 via service_role for the deny tests
    reqUser1Id = randomUUID();
    await svc.from('data_lifecycle_requests').insert({
      id: reqUser1Id,
      athlete_id: user1.athleteId,
      requested_by: user1.userAccountId,
      request_type: 'EXPORT',
      status: 'REQUESTED',
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own ──────────────────────────────────────────────────────────

  it('allows athlete to SELECT their own lifecycle requests', async () => {
    const { data, error } = await user1.client
      .from('data_lifecycle_requests')
      .select('id, request_type, status')
      .eq('id', reqUser1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.request_type).toBe('EXPORT');
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies user from SELECT on another athlete lifecycle request', async () => {
    const { data, error } = await user2.client
      .from('data_lifecycle_requests')
      .select('id')
      .eq('id', reqUser1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) INSERT own ──────────────────────────────────────────────────────────

  it('allows athlete to INSERT their own Habeas Data request', async () => {
    const newId = randomUUID();
    const { error } = await user1.client.from('data_lifecycle_requests').insert({
      id: newId,
      athlete_id: user1.athleteId,
      requested_by: user1.userAccountId,
      request_type: 'DELETION',
      status: 'REQUESTED',
    });

    expect(error).toBeNull();
    await svc.from('data_lifecycle_requests').delete().eq('id', newId);
  });

  // ── (d) INSERT cross-tenant denied ─────────────────────────────────────────

  it('denies athlete from INSERT lifecycle request for another athlete', async () => {
    const { error } = await user1.client.from('data_lifecycle_requests').insert({
      id: randomUUID(),
      athlete_id: user2.athleteId,
      requested_by: user1.userAccountId,
      request_type: 'EXPORT',
      status: 'REQUESTED',
    });

    expect(error).not.toBeNull();
  });

  // ── (e) UPDATE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated UPDATE on lifecycle requests (service_role only)', async () => {
    const { count } = await user1.client
      .from('data_lifecycle_requests')
      .update({ status: 'COMPLETED' }, { count: 'exact' })
      .eq('id', reqUser1Id);

    expect(count).toBe(0);
  });

  // ── (f) DELETE blocked ──────────────────────────────────────────────────────

  it('blocks authenticated DELETE on lifecycle requests (5-year retention)', async () => {
    const { count } = await user1.client
      .from('data_lifecycle_requests')
      .delete({ count: 'exact' })
      .eq('id', reqUser1Id);

    expect(count).toBe(0);
  });
});
