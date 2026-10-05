/**
 * RLS tests — athlete_metric_summaries table
 * Policies:
 *   athlete_metric_summaries_select_athlete
 *   (no INSERT / UPDATE / DELETE policy — derived by service_role)
 *
 * Tested criteria:
 *   (a) athlete can SELECT own summary
 *   (b) a different athlete cannot SELECT it (cross-tenant)
 *   (c) a trainer of the athlete's ACTIVE club cannot SELECT it
 *   (d) the athlete cannot INSERT a summary
 *   (e) the athlete cannot UPDATE their summary
 *   (f) DELETE affects 0 rows
 *   NULL safety: athlete_id is part of the PK; (g) a NULL athlete_id insert
 *   is rejected even for service_role.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addClubTrainer,
  cleanupTestClub,
  cleanupTestUser,
  createTestClub,
  createTestMembership,
  createTestMetricDefinition,
  createTestSport,
  createTestUser,
  deleteTestMetricDefinition,
  deleteTestSport,
  envReady,
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('athlete_metric_summaries RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let definitionId: string;
  let otherDefinitionId: string;
  let athlete: TestUser;
  let stranger: TestUser;
  let trainer: TestUser;
  let clubId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    definitionId = await createTestMetricDefinition(svc);
    otherDefinitionId = await createTestMetricDefinition(svc);
    [athlete, stranger, trainer] = await Promise.all([
      createTestUser(svc, sportId, 'ms-ath'),
      createTestUser(svc, sportId, 'ms-str'),
      createTestUser(svc, sportId, 'ms-tr'),
    ]);
    clubId = await createTestClub(svc, 'ms');
    const trainerRow = await addClubTrainer(svc, clubId, trainer);
    await createTestMembership(svc, {
      clubId,
      athleteId: athlete.athleteId,
      clubTrainerId: trainerRow,
      status: 'ACTIVE',
    });
    const { error } = await svc.from('athlete_metric_summaries').insert({
      athlete_id: athlete.athleteId,
      metric_definition_id: definitionId,
      latest_value: 11.42,
      latest_measured_at: new Date().toISOString(),
      entry_count: 1,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`seed summary: ${error.message}`);
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubId);
    await deleteTestMetricDefinition(svc, definitionId);
    await deleteTestMetricDefinition(svc, otherDefinitionId);
    await Promise.all([athlete, stranger, trainer].map((u) => cleanupTestUser(svc, u)));
    await deleteTestSport(svc, sportId);
  });

  const read = (user: TestUser) =>
    user.client
      .from('athlete_metric_summaries')
      .select('metric_definition_id')
      .eq('athlete_id', athlete.athleteId);

  it('(a) allows the athlete to SELECT own summary', async () => {
    const { data, error } = await read(athlete);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(b) denies a different athlete', async () => {
    const { data, error } = await read(stranger);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("(c) denies a trainer of the athlete's ACTIVE club", async () => {
    const { data, error } = await read(trainer);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(d) denies the athlete inserting a summary', async () => {
    const { error } = await athlete.client.from('athlete_metric_summaries').insert({
      athlete_id: athlete.athleteId,
      metric_definition_id: otherDefinitionId,
      latest_value: 1,
      latest_measured_at: new Date().toISOString(),
      entry_count: 1,
      updated_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it('(e) denies the athlete updating their summary', async () => {
    const { count, error } = await athlete.client
      .from('athlete_metric_summaries')
      .update({ latest_value: 9.5 }, { count: 'exact' })
      .eq('athlete_id', athlete.athleteId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(f) DELETE affects 0 rows', async () => {
    const { count, error } = await athlete.client
      .from('athlete_metric_summaries')
      .delete({ count: 'exact' })
      .eq('athlete_id', athlete.athleteId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(g) rejects a NULL athlete_id even for service_role', async () => {
    const { error } = await svc.from('athlete_metric_summaries').insert({
      athlete_id: null,
      metric_definition_id: otherDefinitionId,
      latest_value: 1,
      latest_measured_at: new Date().toISOString(),
      entry_count: 1,
      updated_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
});
