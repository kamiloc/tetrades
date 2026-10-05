/**
 * RLS tests — metric_definitions table
 * Policies:
 *   metric_definitions_select_public (anon + authenticated, TRUE)
 *   (no INSERT / UPDATE / DELETE policy — service_role only)
 *
 * Tested criteria:
 *   (a) anon can SELECT a definition
 *   (b) two distinct authenticated users can both SELECT it
 *   (c) NULL sport_id does not affect visibility
 *   (d) authenticated INSERT is denied
 *   (e) authenticated UPDATE affects 0 rows
 *   (f) authenticated DELETE affects 0 rows
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createTestMetricDefinition,
  createTestSport,
  createTestUser,
  deleteTestMetricDefinition,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('metric_definitions RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let user1: TestUser;
  let user2: TestUser;
  let definitionId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [user1, user2] = await Promise.all([
      createTestUser(svc, sportId, 'metdef-u1'),
      createTestUser(svc, sportId, 'metdef-u2'),
    ]);
    // createTestMetricDefinition leaves sport_id NULL.
    definitionId = await createTestMetricDefinition(svc);
  });

  afterAll(async () => {
    await deleteTestMetricDefinition(svc, definitionId);
    await Promise.all([cleanupTestUser(svc, user1), cleanupTestUser(svc, user2)]);
    await deleteTestSport(svc, sportId);
  });

  it('(a) allows anon to SELECT a definition', async () => {
    const { data, error } = await getAnonClient()
      .from('metric_definitions')
      .select('id')
      .eq('id', definitionId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(b) allows two distinct users to SELECT the same definition', async () => {
    for (const user of [user1, user2]) {
      const { data, error } = await user.client
        .from('metric_definitions')
        .select('id')
        .eq('id', definitionId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it('(c) returns a definition whose sport_id is NULL', async () => {
    const { data, error } = await user1.client
      .from('metric_definitions')
      .select('id, sport_id')
      .eq('id', definitionId);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: definitionId, sport_id: null }]);
  });

  it('(d) denies authenticated INSERT', async () => {
    const id = randomUUID();
    const { error } = await user1.client.from('metric_definitions').insert({
      id,
      key: `rls_forged_${id.slice(0, 8)}`,
      name: 'Salto vertical',
      unit: 'cm',
    });
    expect(error).not.toBeNull();
  });

  it('(e) authenticated UPDATE affects 0 rows', async () => {
    const { count, error } = await user1.client
      .from('metric_definitions')
      .update({ unit: 'ms' }, { count: 'exact' })
      .eq('id', definitionId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(f) authenticated DELETE affects 0 rows', async () => {
    const { count, error } = await user2.client
      .from('metric_definitions')
      .delete({ count: 'exact' })
      .eq('id', definitionId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
