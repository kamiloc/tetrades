/**
 * RLS deny-tests — trainers vs athlete_private_profiles (trainer-access-boundary spec)
 * Policies (unchanged, owner-only):
 *   athlete_private_profiles_select_own
 *   athlete_private_profiles_insert_own
 *   athlete_private_profiles_update_own
 *
 * Tested criteria, for a trainer whose club holds a membership with the
 * athlete in EVERY status, plus a trainer with no membership at all:
 *   (a) SELECT returns 0 rows (L2-CONFIDENTIAL row unreachable)
 *   (b) UPDATE affects 0 rows
 *   (c) INSERT on the athlete's behalf is denied
 *   (d) the owner can still read their own row (policy not broken)
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
  PLACEHOLDER_BYTES,
  type MembershipStatus,
  type TestUser,
} from './helpers/setup.js';

const STATUSES: MembershipStatus[] = [
  'PENDING_ATHLETE_CONFIRMATION',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
];

describe.skipIf(!envReady)('athlete_private_profiles RLS — trainer boundary', () => {
  const svc = getServiceClient();
  let sportId: string;
  let athlete: TestUser;
  let athleteNoProfile: TestUser;
  let unaffiliatedTrainer: TestUser;
  const trainers = new Map<MembershipStatus | 'NONE', TestUser>();
  const clubIds: string[] = [];

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    athlete = await createTestUser(svc, sportId, 'appt-ath');
    athleteNoProfile = await createTestUser(svc, sportId, 'appt-ath2');
    unaffiliatedTrainer = await createTestUser(svc, sportId, 'appt-none');

    const { error } = await svc.from('athlete_private_profiles').insert({
      athlete_id: athlete.athleteId,
      exact_dob_enc: PLACEHOLDER_BYTES,
      encryption_key_version: 'v1',
      onboarding_status: 'COMPLETE',
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`seed private profile: ${error.message}`);

    // One club per status so the open-membership uniqueness rule is not hit.
    for (const status of STATUSES) {
      const trainer = await createTestUser(svc, sportId, `appt-${status.slice(0, 4).toLowerCase()}`);
      const clubId = await createTestClub(svc, `appt-${status.toLowerCase()}`);
      clubIds.push(clubId);
      const row = await addClubTrainer(svc, clubId, trainer);
      await createTestMembership(svc, { clubId, athleteId: athlete.athleteId, clubTrainerId: row, status });
      await createTestMembership(svc, {
        clubId,
        athleteId: athleteNoProfile.athleteId,
        clubTrainerId: row,
        status,
      });
      trainers.set(status, trainer);
    }
    const noneClub = await createTestClub(svc, 'appt-none');
    clubIds.push(noneClub);
    await addClubTrainer(svc, noneClub, unaffiliatedTrainer);
    trainers.set('NONE', unaffiliatedTrainer);
  });

  afterAll(async () => {
    for (const clubId of clubIds) await cleanupTestClub(svc, clubId);
    await Promise.all(
      [athlete, athleteNoProfile, ...trainers.values()].map((u) => cleanupTestUser(svc, u)),
    );
    await deleteTestSport(svc, sportId);
  });

  for (const status of [...STATUSES, 'NONE'] as const) {
    describe(`trainer with membership ${status}`, () => {
      const trainer = (): TestUser => {
        const t = trainers.get(status);
        if (t === undefined) throw new Error(`no trainer for ${status}`);
        return t;
      };

      it('(a) cannot SELECT the private profile', async () => {
        const { data, error } = await trainer()
          .client.from('athlete_private_profiles')
          .select('athlete_id')
          .eq('athlete_id', athlete.athleteId);
        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });

      it('(b) cannot UPDATE the private profile', async () => {
        const { count, error } = await trainer()
          .client.from('athlete_private_profiles')
          .update({ encryption_key_version: 'forged' }, { count: 'exact' })
          .eq('athlete_id', athlete.athleteId);
        expect(error).toBeNull();
        expect(count).toBe(0);
      });

      it("(c) cannot INSERT a private profile on the athlete's behalf", async () => {
        const { error } = await trainer().client.from('athlete_private_profiles').insert({
          athlete_id: athleteNoProfile.athleteId,
          encryption_key_version: 'v1',
          onboarding_status: 'NOT_STARTED',
          updated_at: new Date().toISOString(),
        });
        expect(error).not.toBeNull();
      });
    });
  }

  it('(d) the owner still reads their own private profile', async () => {
    const { data, error } = await athlete.client
      .from('athlete_private_profiles')
      .select('athlete_id')
      .eq('athlete_id', athlete.athleteId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
