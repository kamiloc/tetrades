/**
 * RLS tests — device_tokens table
 * Policies:
 *   device_tokens_select_own
 *   device_tokens_insert_own
 *   device_tokens_update_own
 *   device_tokens_delete_own
 *
 * Tested criteria:
 *   (a) owner can INSERT a token for their own account
 *   (b) owner can SELECT their own token
 *   (c) another user cannot SELECT it (cross-tenant)
 *   (d) a trainer of the owner's ACTIVE club cannot SELECT it
 *   (e) a user cannot INSERT a token for another account
 *   (f) owner can UPDATE their token; another user's UPDATE affects 0 rows
 *   (g) re-parenting via UPDATE is blocked
 *   (h) another user's DELETE affects 0 rows; owner can DELETE
 *   (i) a NULL user_account_id is rejected
 *   (j) anon sees nothing
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

const token = () => `ExponentPushToken[rls${randomUUID().replace(/-/g, '').slice(0, 16)}]`;

describe.skipIf(!envReady)('device_tokens RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let owner: TestUser;
  let other: TestUser;
  let trainer: TestUser;
  let clubId: string;
  const tokenId = randomUUID();

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [owner, other, trainer] = await Promise.all([
      createTestUser(svc, sportId, 'dt-own'),
      createTestUser(svc, sportId, 'dt-oth'),
      createTestUser(svc, sportId, 'dt-tr'),
    ]);
    clubId = await createTestClub(svc, 'dt');
    const row = await addClubTrainer(svc, clubId, trainer);
    await createTestMembership(svc, { clubId, athleteId: owner.athleteId, clubTrainerId: row, status: 'ACTIVE' });
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubId);
    await Promise.all([owner, other, trainer].map((u) => cleanupTestUser(svc, u)));
    await deleteTestSport(svc, sportId);
  });

  const read = (user: TestUser) =>
    user.client.from('device_tokens').select('id').eq('id', tokenId);

  it('(a) allows the owner to INSERT a token for their own account', async () => {
    const { error } = await owner.client.from('device_tokens').insert({
      id: tokenId,
      user_account_id: owner.userAccountId,
      token: token(),
      platform: 'ANDROID',
    });
    expect(error).toBeNull();
  });

  it('(b) allows the owner to SELECT their token', async () => {
    const { data, error } = await read(owner);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(c) denies another user', async () => {
    const { data, error } = await read(other);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("(d) denies a trainer of the owner's ACTIVE club", async () => {
    const { data, error } = await read(trainer);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(e) denies registering a token for another account', async () => {
    const { error } = await other.client.from('device_tokens').insert({
      id: randomUUID(),
      user_account_id: owner.userAccountId,
      token: token(),
      platform: 'IOS',
    });
    expect(error).not.toBeNull();
  });

  it("(f) allows the owner's UPDATE and denies another user's", async () => {
    const own = await owner.client
      .from('device_tokens')
      .update({ last_seen_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', tokenId);
    expect(own.error).toBeNull();
    expect(own.count).toBe(1);

    const foreign = await other.client
      .from('device_tokens')
      .update({ platform: 'IOS' }, { count: 'exact' })
      .eq('id', tokenId);
    expect(foreign.error).toBeNull();
    expect(foreign.count).toBe(0);
  });

  it('(g) blocks re-parenting the token to another account', async () => {
    const { error } = await owner.client
      .from('device_tokens')
      .update({ user_account_id: other.userAccountId })
      .eq('id', tokenId);
    expect(error).not.toBeNull();
  });

  it("(h) denies another user's DELETE and allows the owner's", async () => {
    const foreign = await other.client.from('device_tokens').delete({ count: 'exact' }).eq('id', tokenId);
    expect(foreign.error).toBeNull();
    expect(foreign.count).toBe(0);

    const own = await owner.client.from('device_tokens').delete({ count: 'exact' }).eq('id', tokenId);
    expect(own.error).toBeNull();
    expect(own.count).toBe(1);
  });

  it('(i) rejects a NULL user_account_id', async () => {
    const { error } = await owner.client.from('device_tokens').insert({
      id: randomUUID(),
      user_account_id: null,
      token: token(),
      platform: 'IOS',
    });
    expect(error).not.toBeNull();
  });

  it('(j) shows anon nothing', async () => {
    const { data, error } = await getAnonClient().from('device_tokens').select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
