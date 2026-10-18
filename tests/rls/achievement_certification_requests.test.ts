/**
 * RLS tests — achievement_certification_requests table
 * Policies:
 *   achievement_certification_requests_select_athlete       (own achievements, every status)
 *   achievement_certification_requests_select_club_trainer  (trainers of the club, PENDING only)
 *   (no INSERT / UPDATE / DELETE policy — the API writes as service_role)
 * Constraints exercised:
 *   supabase/constraints/achievement_certification_transitions.sql
 *   supabase/constraints/achievement_certification_open_unique.sql (partial unique index)
 *
 * Tested criteria:
 *   (a) the athlete reads their requests in every status
 *   (b) a different athlete reads none (cross-tenant)
 *   (c) a trainer of the club reads only its PENDING request
 *   (d) a trainer of another club reads none
 *   (e) an anonymous caller reads none
 *   (f) athlete and trainer INSERTs are denied
 *   (g) athlete and trainer UPDATEs (including a trainer self-approving) affect 0 rows
 *   (h) DELETE affects 0 rows
 *   (i) NULL handling: PENDING rows have NULL decision columns and are still
 *       visible to the club's trainers; a NULL club_membership_id is rejected
 *   (j) lifecycle for every writer (service_role included): a second PENDING
 *       per achievement, an insert as APPROVED, APPROVED without a trainer,
 *       REJECTED without a reason, and reopening a terminal row are rejected
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

describe.skipIf(!envReady)('achievement_certification_requests RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let trainerA: TestUser;
  let trainerB: TestUser;
  let athleteX: TestUser;
  let athleteY: TestUser;
  let clubA: string;
  let clubB: string;
  let trainerARow: string;
  let membershipXA: string;
  let pendingId: string;
  let approvedId: string;
  let rejectedId: string;
  let cancelledId: string;
  let pendingAchievement: string;
  let freeAchievement: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [trainerA, trainerB, athleteX, athleteY] = await Promise.all([
      createTestUser(svc, sportId, 'acr-ta'),
      createTestUser(svc, sportId, 'acr-tb'),
      createTestUser(svc, sportId, 'acr-x'),
      createTestUser(svc, sportId, 'acr-y'),
    ]);
    clubA = await createTestClub(svc, 'acr-a');
    clubB = await createTestClub(svc, 'acr-b');
    trainerARow = await addClubTrainer(svc, clubA, trainerA);
    await addClubTrainer(svc, clubB, trainerB);
    membershipXA = await createTestMembership(svc, {
      clubId: clubA,
      athleteId: athleteX.athleteId,
      clubTrainerId: trainerARow,
      status: 'ACTIVE',
    });

    const request = async (status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
      const achievementId = await createTestAchievement(svc, athleteX.athleteId);
      const id = await createTestCertificationRequest(svc, {
        achievementId,
        clubId: clubA,
        clubMembershipId: membershipXA,
        status,
        deciderRowId: trainerARow,
      });
      return { id, achievementId };
    };
    const pending = await request('PENDING');
    pendingId = pending.id;
    pendingAchievement = pending.achievementId;
    approvedId = (await request('APPROVED')).id;
    rejectedId = (await request('REJECTED')).id;
    cancelledId = (await request('CANCELLED')).id;
    freeAchievement = await createTestAchievement(svc, athleteX.athleteId);
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubA);
    await cleanupTestClub(svc, clubB);
    for (const u of [trainerA, trainerB, athleteX, athleteY]) await cleanupTestUser(svc, u);
    await deleteTestSport(svc, sportId);
  });

  const visibleIds = async (client: ReturnType<typeof getAnonClient>) => {
    const { data, error } = await client
      .from('achievement_certification_requests')
      .select('id')
      .eq('club_id', clubA);
    expect(error).toBeNull();
    return (data ?? []).map((r: { id: string }) => r.id).sort();
  };

  // ── SELECT ──────────────────────────────────────────────────────────────────

  it('(a) lets the athlete read their requests in every status, with the reason', async () => {
    expect(await visibleIds(athleteX.client)).toEqual(
      [pendingId, approvedId, rejectedId, cancelledId].sort(),
    );
    const { data } = await athleteX.client
      .from('achievement_certification_requests')
      .select('rejection_reason')
      .eq('id', rejectedId)
      .single();
    expect(data?.rejection_reason).toBe('La planilla no coincide con la fecha.');
  });

  it('(b) denies a different athlete', async () => {
    expect(await visibleIds(athleteY.client)).toEqual([]);
  });

  it('(c, i) lets a trainer of the club read only its PENDING request (NULL decision columns)', async () => {
    expect(await visibleIds(trainerA.client)).toEqual([pendingId]);
    const { data } = await trainerA.client
      .from('achievement_certification_requests')
      .select('decided_by_club_trainer_id, decided_at, rejection_reason')
      .eq('id', pendingId)
      .single();
    expect(data).toEqual({
      decided_by_club_trainer_id: null,
      decided_at: null,
      rejection_reason: null,
    });
  });

  it('(d) denies a trainer of another club', async () => {
    expect(await visibleIds(trainerB.client)).toEqual([]);
  });

  it('(e) denies an anonymous caller', async () => {
    expect(await visibleIds(getAnonClient())).toEqual([]);
  });

  // ── Writes ──────────────────────────────────────────────────────────────────

  it('(f) denies INSERT by the athlete and by a trainer of the club', async () => {
    for (const client of [athleteX.client, trainerA.client]) {
      const { error } = await client.from('achievement_certification_requests').insert({
        id: randomUUID(),
        achievement_id: freeAchievement,
        club_id: clubA,
        club_membership_id: membershipXA,
        status: 'PENDING',
      });
      expect(error).not.toBeNull();
    }
  });

  it('(g) UPDATEs by the athlete or a trainer (self-approval) affect 0 rows', async () => {
    for (const client of [athleteX.client, trainerA.client]) {
      const { count, error } = await client
        .from('achievement_certification_requests')
        .update(
          {
            status: 'APPROVED',
            decided_by_club_trainer_id: trainerARow,
            decided_at: new Date().toISOString(),
          },
          { count: 'exact' },
        )
        .eq('id', pendingId);
      expect(error).toBeNull();
      expect(count).toBe(0);
    }
    const { data } = await svc
      .from('achievement_certification_requests')
      .select('status')
      .eq('id', pendingId)
      .single();
    expect(data?.status).toBe('PENDING');
  });

  it('(h) DELETE affects 0 rows', async () => {
    for (const client of [athleteX.client, trainerA.client]) {
      const { count, error } = await client
        .from('achievement_certification_requests')
        .delete({ count: 'exact' })
        .eq('id', rejectedId);
      expect(error).toBeNull();
      expect(count).toBe(0);
    }
  });

  // ── Lifecycle (every writer) ───────────────────────────────────────────────

  it('(i) rejects a NULL club_membership_id', async () => {
    const { error } = await svc.from('achievement_certification_requests').insert({
      id: randomUUID(),
      achievement_id: freeAchievement,
      club_id: clubA,
      club_membership_id: null,
      status: 'PENDING',
    });
    expect(error).not.toBeNull();
  });

  it('(j) rejects a second PENDING request for the same achievement', async () => {
    const { error } = await svc.from('achievement_certification_requests').insert({
      id: randomUUID(),
      achievement_id: pendingAchievement,
      club_id: clubA,
      club_membership_id: membershipXA,
      status: 'PENDING',
    });
    expect(error).not.toBeNull();
  });

  it('(j) rejects an insert that starts APPROVED', async () => {
    const { error } = await svc.from('achievement_certification_requests').insert({
      id: randomUUID(),
      achievement_id: freeAchievement,
      club_id: clubA,
      club_membership_id: membershipXA,
      status: 'APPROVED',
      decided_by_club_trainer_id: trainerARow,
      decided_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it('(j) rejects APPROVED without a deciding trainer and REJECTED without a reason', async () => {
    const noTrainer = await svc
      .from('achievement_certification_requests')
      .update({ status: 'APPROVED', decided_at: new Date().toISOString() })
      .eq('id', pendingId);
    expect(noTrainer.error).not.toBeNull();

    const noReason = await svc
      .from('achievement_certification_requests')
      .update({
        status: 'REJECTED',
        decided_by_club_trainer_id: trainerARow,
        decided_at: new Date().toISOString(),
        rejection_reason: '   ',
      })
      .eq('id', pendingId);
    expect(noReason.error).not.toBeNull();
  });

  it('(j) never reopens or edits a terminal request', async () => {
    for (const id of [approvedId, rejectedId, cancelledId]) {
      const { error } = await svc
        .from('achievement_certification_requests')
        .update({
          status: 'PENDING',
          decided_by_club_trainer_id: null,
          decided_at: null,
          rejection_reason: null,
        })
        .eq('id', id);
      expect(error).not.toBeNull();
    }
  });
});
