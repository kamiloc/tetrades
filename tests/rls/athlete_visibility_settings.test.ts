/**
 * RLS tests — athlete_visibility_settings table
 * Policies:
 *   athlete_visibility_settings_select_own
 *   athlete_visibility_settings_insert_own
 *   athlete_visibility_settings_update_own
 *   (no DELETE policy — deletePII as service_role)
 *
 * Tested criteria:
 *   (a) a missing row returns nothing (API resolves it to the category defaults)
 *   (b) owner can INSERT their own settings
 *   (c) owner can SELECT their own settings; omitted columns take their
 *       defaults (club memberships PRIVATE, achievements PUBLIC)
 *   (d) a different athlete cannot SELECT them (cross-tenant)
 *   (e) a trainer of the athlete's ACTIVE club cannot SELECT them
 *   (f) a different athlete cannot INSERT settings for the owner
 *   (g) owner can UPDATE their own settings
 *   (h) a different athlete cannot UPDATE them
 *   (i) re-parenting via UPDATE is blocked
 *   (j) DELETE affects 0 rows
 *   (k) a NULL athlete_id insert is rejected
 */

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
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('athlete_visibility_settings RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let owner: TestUser;
  let other: TestUser;
  let trainer: TestUser;
  let clubId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [owner, other, trainer] = await Promise.all([
      createTestUser(svc, sportId, 'vis-own'),
      createTestUser(svc, sportId, 'vis-oth'),
      createTestUser(svc, sportId, 'vis-tr'),
    ]);
    clubId = await createTestClub(svc, 'vis');
    const trainerRow = await addClubTrainer(svc, clubId, trainer);
    await createTestMembership(svc, {
      clubId,
      athleteId: owner.athleteId,
      clubTrainerId: trainerRow,
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubId);
    await Promise.all([owner, other, trainer].map((u) => cleanupTestUser(svc, u)));
    await deleteTestSport(svc, sportId);
  });

  const read = (user: TestUser) =>
    user.client
      .from('athlete_visibility_settings')
      .select('metrics_audience, club_memberships_audience, achievements_audience')
      .eq('athlete_id', owner.athleteId);

  it('(a) returns nothing when the owner has no settings row', async () => {
    const { data, error } = await read(owner);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(b) allows the owner to INSERT their own settings', async () => {
    const { error } = await owner.client.from('athlete_visibility_settings').insert({
      athlete_id: owner.athleteId,
      metrics_audience: 'CONNECTIONS',
      updated_at: new Date().toISOString(),
    });
    expect(error).toBeNull();
  });

  it('(c) allows the owner to SELECT their settings, with column defaults', async () => {
    const { data, error } = await read(owner);
    expect(error).toBeNull();
    expect(data).toEqual([
      {
        metrics_audience: 'CONNECTIONS',
        club_memberships_audience: 'PRIVATE',
        achievements_audience: 'PUBLIC',
      },
    ]);
  });

  it('(d) denies a different athlete', async () => {
    const { data, error } = await read(other);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("(e) denies a trainer of the owner's ACTIVE club", async () => {
    const { data, error } = await read(trainer);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(f) denies inserting settings for another athlete', async () => {
    await svc.from('athlete_visibility_settings').delete().eq('athlete_id', other.athleteId);
    const { error } = await owner.client.from('athlete_visibility_settings').insert({
      athlete_id: other.athleteId,
      metrics_audience: 'PUBLIC',
      updated_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it('(g) allows the owner to UPDATE their settings', async () => {
    const { count, error } = await owner.client
      .from('athlete_visibility_settings')
      .update({ metrics_audience: 'PUBLIC', updated_at: new Date().toISOString() }, { count: 'exact' })
      .eq('athlete_id', owner.athleteId);
    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("(h) denies a different athlete updating the owner's settings", async () => {
    const { count, error } = await other.client
      .from('athlete_visibility_settings')
      .update({ metrics_audience: 'PRIVATE' }, { count: 'exact' })
      .eq('athlete_id', owner.athleteId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(i) blocks re-parenting the row to another athlete', async () => {
    const { error } = await owner.client
      .from('athlete_visibility_settings')
      .update({ athlete_id: other.athleteId })
      .eq('athlete_id', owner.athleteId);
    expect(error).not.toBeNull();
  });

  it('(j) DELETE affects 0 rows', async () => {
    const { count, error } = await owner.client
      .from('athlete_visibility_settings')
      .delete({ count: 'exact' })
      .eq('athlete_id', owner.athleteId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(k) rejects a NULL athlete_id', async () => {
    const { error } = await owner.client.from('athlete_visibility_settings').insert({
      athlete_id: null,
      metrics_audience: 'PUBLIC',
      updated_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
});
