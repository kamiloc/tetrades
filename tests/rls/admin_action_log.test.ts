/**
 * RLS tests — admin_action_log (ADR-017)
 * Policies: none for client roles; REVOKE ALL from anon and authenticated
 *   (supabase/policies/admin_action_log.sql). The API inserts through its
 *   own connection (postgres, rolbypassrls = true).
 *
 * Tested criteria:
 *   (a) an admin reads zero rows, including the rows they are the actor of
 *   (b) an athlete and anon read zero rows (cross-tenant: two distinct users)
 *   (c) client INSERT is denied for the admin and for an athlete
 *   (d) client UPDATE and DELETE change nothing
 *   (e) NULL actor_user_account_id is rejected even for service_role
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestClub,
  cleanupTestUser,
  createAdminUser,
  createTestClub,
  createTestSport,
  createTestUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  type AdminUser,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('admin_action_log RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let admin: AdminUser;
  let athlete: TestUser;
  let clubId: string;
  let logId: string;

  const row = (actor: string | null) => ({
    id: randomUUID(),
    actor_user_account_id: actor,
    action: 'CLUB_CREATED',
    target_type: 'club',
    target_id: clubId,
    request_id: `req-${randomUUID().slice(0, 8)}`,
    metadata: {},
  });

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [admin, athlete] = await Promise.all([
      createAdminUser(svc, 'aal-admin'),
      createTestUser(svc, sportId, 'aal-ath'),
    ]);
    clubId = await createTestClub(svc, 'aal');
    const seeded = row(admin.userAccountId);
    const { error } = await svc.from('admin_action_log').insert(seeded);
    if (error) throw new Error(`seed admin_action_log: ${error.message}`);
    logId = seeded.id;
  });

  afterAll(async () => {
    await svc.from('admin_action_log').delete().eq('target_id', clubId);
    await cleanupTestClub(svc, clubId);
    await Promise.all([cleanupTestUser(svc, admin), cleanupTestUser(svc, athlete)]);
    await deleteTestSport(svc, sportId);
  });

  const visible = async (client: ReturnType<typeof getAnonClient>) => {
    const { data } = await client.from('admin_action_log').select('id').eq('id', logId);
    return data ?? [];
  };

  it('(a) shows the acting admin zero rows', async () => {
    expect(await visible(admin.client)).toHaveLength(0);
  });

  it('(b) shows an athlete and anon zero rows', async () => {
    expect(await visible(athlete.client)).toHaveLength(0);
    expect(await visible(getAnonClient())).toHaveLength(0);
  });

  it('(c) denies client INSERT for the admin and for an athlete', async () => {
    for (const user of [admin, athlete]) {
      const { error } = await user.client.from('admin_action_log').insert(row(user.userAccountId));
      expect(error).not.toBeNull();
    }
  });

  it('(d) client UPDATE and DELETE change nothing', async () => {
    for (const user of [admin, athlete]) {
      const up = await user.client
        .from('admin_action_log')
        .update({ action: 'CLUB_DEACTIVATED' }, { count: 'exact' })
        .eq('id', logId);
      expect(up.error !== null || up.count === 0).toBe(true);
      const del = await user.client.from('admin_action_log').delete({ count: 'exact' }).eq('id', logId);
      expect(del.error !== null || del.count === 0).toBe(true);
    }
    const { data } = await svc
      .from('admin_action_log')
      .select('action')
      .eq('id', logId)
      .single<{ action: string }>();
    expect(data?.action).toBe('CLUB_CREATED');
  });

  it('(e) rejects a NULL actor even for service_role', async () => {
    const { error } = await svc.from('admin_action_log').insert(row(null));
    expect(error).not.toBeNull();
  });
});
