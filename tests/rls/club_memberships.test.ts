/**
 * RLS tests — club_memberships table
 * Policies:
 *   club_memberships_select_athlete       (own memberships)
 *   club_memberships_select_club_trainer  (trainers of the membership's club)
 *   club_memberships_insert_club_trainer  (invite to own club as PENDING)
 *   club_memberships_update_athlete       (athlete, open rows only)
 *   (no DELETE policy — deletePII as service_role)
 * Constraints exercised:
 *   supabase/constraints/club_membership_open_unique.sql
 *   supabase/constraints/club_membership_transitions.sql
 *
 * Tested criteria:
 *   (a) athlete can SELECT own membership
 *   (b) a different athlete cannot SELECT it (cross-tenant)
 *   (c) a trainer of the club can SELECT it
 *   (d) a trainer of another club cannot SELECT it
 *   (e) trainer can INSERT an invitation to their own club
 *   (f) trainer cannot INSERT an invitation to another club
 *   (g) trainer cannot sign an invitation with another trainer's row
 *   (h) trainer cannot INSERT a membership as ACTIVE
 *   (i) a non-trainer cannot INSERT an invitation
 *   (j) NULL handling: responded_at set on insert is denied; NULL
 *       invited_by_club_trainer_id is rejected
 *   (k) athlete accepts PENDING → ACTIVE, then leaves ACTIVE → COMPLETED
 *   (l) athlete rejects PENDING → REJECTED
 *   (m) trainer cannot accept on the athlete's behalf
 *   (n) a different athlete cannot UPDATE the membership
 *   (o) terminal rows cannot be reopened (0 rows targetable)
 *   (p) illegal edge PENDING → COMPLETED is rejected by the trigger
 *   (q) re-parenting athlete_id is rejected
 *   (r) DELETE affects 0 rows
 *   (s) a duplicate open membership is rejected; re-invitation after a
 *       terminal state is allowed and leaves the old row unchanged
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
  getServiceClient,
  type TestUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('club_memberships RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let trainerA: TestUser;
  let trainerB: TestUser;
  let athleteX: TestUser;
  let athleteY: TestUser;
  let clubA: string;
  let clubB: string;
  let trainerARow: string;
  let trainerBRow: string;
  let pendingX: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [trainerA, trainerB, athleteX, athleteY] = await Promise.all([
      createTestUser(svc, sportId, 'cm-ta'),
      createTestUser(svc, sportId, 'cm-tb'),
      createTestUser(svc, sportId, 'cm-x'),
      createTestUser(svc, sportId, 'cm-y'),
    ]);
    clubA = await createTestClub(svc, 'cm-a');
    clubB = await createTestClub(svc, 'cm-b');
    trainerARow = await addClubTrainer(svc, clubA, trainerA);
    trainerBRow = await addClubTrainer(svc, clubB, trainerB);
    pendingX = await createTestMembership(svc, {
      clubId: clubA,
      athleteId: athleteX.athleteId,
      clubTrainerId: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubA);
    await cleanupTestClub(svc, clubB);
    await Promise.all(
      [trainerA, trainerB, athleteX, athleteY].map((u) => cleanupTestUser(svc, u)),
    );
    await deleteTestSport(svc, sportId);
  });

  const selectById = (user: TestUser, id: string) =>
    user.client.from('club_memberships').select('id, status').eq('id', id);

  // ── SELECT ──────────────────────────────────────────────────────────────────

  it('(a) allows the athlete to SELECT their own membership', async () => {
    const { data, error } = await selectById(athleteX, pendingX);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(b) denies a different athlete', async () => {
    const { data, error } = await selectById(athleteY, pendingX);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(c) allows a trainer of the club', async () => {
    const { data, error } = await selectById(trainerA, pendingX);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(d) denies a trainer of another club', async () => {
    const { data, error } = await selectById(trainerB, pendingX);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── INSERT ──────────────────────────────────────────────────────────────────

  it('(e) allows a trainer to invite an athlete to their own club', async () => {
    const id = randomUUID();
    const { error } = await trainerA.client.from('club_memberships').insert({
      id,
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(error).toBeNull();
    await svc.from('club_memberships').delete().eq('id', id);
  });

  it('(f) denies inviting to another club', async () => {
    const { error } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubB,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(error).not.toBeNull();
  });

  it("(g) denies signing with another trainer's row", async () => {
    const { error } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubB,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerBRow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(error).not.toBeNull();
  });

  it('(h) denies inserting a membership as ACTIVE', async () => {
    const { error } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'ACTIVE',
    });
    expect(error).not.toBeNull();
  });

  it('(i) denies a non-trainer creating an invitation', async () => {
    const { error } = await athleteY.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(error).not.toBeNull();
  });

  it('(j) handles NULL columns: responded_at set is denied, NULL inviter is rejected', async () => {
    const { error: respondedErr } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
      responded_at: new Date().toISOString(),
    });
    expect(respondedErr).not.toBeNull();

    const { error: nullInviterErr } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: null,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(nullInviterErr).not.toBeNull();
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  it('(k) lets the athlete accept, then leave', async () => {
    const id = await createTestMembership(svc, {
      clubId: clubB,
      athleteId: athleteX.athleteId,
      clubTrainerId: trainerBRow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });

    const accept = await athleteX.client
      .from('club_memberships')
      .update({ status: 'ACTIVE', responded_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id);
    expect(accept.error).toBeNull();
    expect(accept.count).toBe(1);

    const leave = await athleteX.client
      .from('club_memberships')
      .update({ status: 'COMPLETED', ended_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id);
    expect(leave.error).toBeNull();
    expect(leave.count).toBe(1);

    await svc.from('club_memberships').delete().eq('id', id);
  });

  it('(l) lets the athlete reject an invitation', async () => {
    const id = await createTestMembership(svc, {
      clubId: clubB,
      athleteId: athleteY.athleteId,
      clubTrainerId: trainerBRow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    const { error, count } = await athleteY.client
      .from('club_memberships')
      .update({ status: 'REJECTED' }, { count: 'exact' })
      .eq('id', id);
    expect(error).toBeNull();
    expect(count).toBe(1);
    await svc.from('club_memberships').delete().eq('id', id);
  });

  it("(m) denies a trainer accepting on the athlete's behalf", async () => {
    const { count, error } = await trainerA.client
      .from('club_memberships')
      .update({ status: 'ACTIVE' }, { count: 'exact' })
      .eq('id', pendingX);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(n) denies a different athlete updating the membership', async () => {
    const { count, error } = await athleteY.client
      .from('club_memberships')
      .update({ status: 'REJECTED' }, { count: 'exact' })
      .eq('id', pendingX);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(o) does not let the athlete reopen a terminal membership', async () => {
    for (const status of ['REJECTED', 'COMPLETED'] as const) {
      const id = await createTestMembership(svc, {
        clubId: clubB,
        athleteId: athleteY.athleteId,
        clubTrainerId: trainerBRow,
        status,
      });
      const { count, error } = await athleteY.client
        .from('club_memberships')
        .update({ status: 'ACTIVE' }, { count: 'exact' })
        .eq('id', id);
      expect(error).toBeNull();
      expect(count).toBe(0);
      await svc.from('club_memberships').delete().eq('id', id);
    }
  });

  it('(p) rejects the illegal edge PENDING → COMPLETED', async () => {
    const { error } = await athleteX.client
      .from('club_memberships')
      .update({ status: 'COMPLETED' })
      .eq('id', pendingX);
    expect(error).not.toBeNull();

    const { data } = await svc.from('club_memberships').select('status').eq('id', pendingX);
    expect(data).toEqual([{ status: 'PENDING_ATHLETE_CONFIRMATION' }]);
  });

  it('(q) rejects re-parenting the membership to another athlete', async () => {
    const { error } = await athleteX.client
      .from('club_memberships')
      .update({ athlete_id: athleteY.athleteId, status: 'ACTIVE' })
      .eq('id', pendingX);
    expect(error).not.toBeNull();
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('(r) DELETE affects 0 rows for athlete and trainer', async () => {
    for (const user of [athleteX, trainerA]) {
      const { count, error } = await user.client
        .from('club_memberships')
        .delete({ count: 'exact' })
        .eq('id', pendingX);
      expect(error).toBeNull();
      expect(count).toBe(0);
    }
  });

  // ── Open-membership uniqueness ──────────────────────────────────────────────

  it('(s) rejects a duplicate open membership and allows re-invitation after a terminal state', async () => {
    const { error: dupErr } = await trainerA.client.from('club_memberships').insert({
      id: randomUUID(),
      club_id: clubA,
      athlete_id: athleteX.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(dupErr).not.toBeNull();

    const rejectedId = await createTestMembership(svc, {
      clubId: clubA,
      athleteId: athleteY.athleteId,
      clubTrainerId: trainerARow,
      status: 'REJECTED',
    });
    const reinviteId = randomUUID();
    const { error: reinviteErr } = await trainerA.client.from('club_memberships').insert({
      id: reinviteId,
      club_id: clubA,
      athlete_id: athleteY.athleteId,
      invited_by_club_trainer_id: trainerARow,
      status: 'PENDING_ATHLETE_CONFIRMATION',
    });
    expect(reinviteErr).toBeNull();

    const { data } = await svc.from('club_memberships').select('status').eq('id', rejectedId);
    expect(data).toEqual([{ status: 'REJECTED' }]);

    await svc.from('club_memberships').delete().in('id', [rejectedId, reinviteId]);
  });
});
