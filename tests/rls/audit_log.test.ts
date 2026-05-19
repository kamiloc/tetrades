/**
 * RLS tests — audit_log table
 * Policy: audit_log_select_own_actor  (SELECT only; no INSERT/UPDATE/DELETE for authenticated)
 *
 * Tested criteria:
 *   (a) athlete can SELECT audit events where they were the actor
 *   (b) athlete CANNOT see audit events where another user was the actor
 *   (c) authenticated INSERT is blocked (service_role only)
 *   (d) UPDATE is blocked (append-only)
 *   (e) DELETE is blocked (5-year retention)
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

describe.skipIf(!envReady)('audit_log RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let auditEventUser1Id: string;
  let auditEventUser2Id: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'audit-u1'),
      createTestUser(svc, sportId, 'audit-u2'),
    ]);

    // Insert audit events via service_role (the only allowed writer)
    auditEventUser1Id = randomUUID();
    await svc.from('audit_log').insert({
      id: auditEventUser1Id,
      actor_user_account_id: user1.userAccountId,
      athlete_id: user1.athleteId,
      event_type: 'DECRYPT_PII',
      target_type: 'athlete_private_profiles',
      target_id: user1.athleteId,
      purpose_code: 'athlete_viewed_own_private_profile',
      request_id: randomUUID(),
    });

    auditEventUser2Id = randomUUID();
    await svc.from('audit_log').insert({
      id: auditEventUser2Id,
      actor_user_account_id: user2.userAccountId,
      athlete_id: user2.athleteId,
      event_type: 'DECRYPT_PII',
      target_type: 'athlete_private_profiles',
      target_id: user2.athleteId,
      purpose_code: 'athlete_viewed_own_private_profile',
      request_id: randomUUID(),
    });
  });

  afterAll(async () => {
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  // ── (a) SELECT own actor ────────────────────────────────────────────────────

  it('allows user to SELECT audit events where they were the actor', async () => {
    const { data, error } = await user1.client
      .from('audit_log')
      .select('id')
      .eq('id', auditEventUser1Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  // ── (b) SELECT cross-tenant denied ─────────────────────────────────────────

  it('denies user from SELECT on audit events of another actor', async () => {
    const { data, error } = await user1.client
      .from('audit_log')
      .select('id')
      .eq('id', auditEventUser2Id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── (c) INSERT blocked ──────────────────────────────────────────────────────

  it('blocks authenticated INSERT on audit_log (service_role only)', async () => {
    const { error } = await user1.client.from('audit_log').insert({
      id: randomUUID(),
      actor_user_account_id: user1.userAccountId,
      athlete_id: user1.athleteId,
      event_type: 'FORGED_EVENT',
      target_type: 'athletes',
      target_id: user1.athleteId,
      purpose_code: 'test',
      request_id: randomUUID(),
    });

    expect(error).not.toBeNull();
  });

  // ── (d) UPDATE blocked (append-only) ────────────────────────────────────────

  it('blocks authenticated UPDATE on audit_log (append-only)', async () => {
    const { count } = await user1.client
      .from('audit_log')
      .update({ event_type: 'TAMPERED' }, { count: 'exact' })
      .eq('id', auditEventUser1Id);

    expect(count).toBe(0);
  });

  // ── (e) DELETE blocked (5-year retention) ───────────────────────────────────

  it('blocks authenticated DELETE on audit_log (retention policy)', async () => {
    const { count } = await user1.client
      .from('audit_log')
      .delete({ count: 'exact' })
      .eq('id', auditEventUser1Id);

    expect(count).toBe(0);
  });
});
