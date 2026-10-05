/**
 * RLS tests — athlete_metric_entries table
 * Policies:
 *   athlete_metric_entries_select_athlete
 *   athlete_metric_entries_select_active_club_trainer
 *   athlete_metric_entries_insert_active_club_trainer
 *   (no UPDATE / DELETE policy — append-only; deletePII as service_role)
 * Constraint exercised:
 *   supabase/constraints/athlete_metric_entry_active_membership.sql
 *
 * Tested criteria:
 *   (a) trainer of an ACTIVE club can INSERT an entry
 *   (b) trainer cannot INSERT for PENDING_ATHLETE_CONFIRMATION (ADR-013 mandatory)
 *   (c) trainer cannot INSERT for COMPLETED
 *   (d) trainer cannot INSERT for REJECTED
 *   (e) trainer of club A cannot INSERT for an athlete active only in club B,
 *       neither with their own row nor with club B's trainer row
 *   (f) athlete_id cannot differ from the membership's athlete
 *   (g) athlete can SELECT own entries; a different athlete cannot (cross-tenant)
 *   (h) ACTIVE-club trainer can SELECT; other-club trainer cannot
 *   (i) after the membership becomes COMPLETED, the club's trainer loses SELECT
 *   (j) UPDATE affects 0 rows for athlete and trainer; service_role UPDATE is
 *       rejected by the append-only trigger
 *   (k) DELETE affects 0 rows for athlete and trainer
 *   (l) NULL club_membership_id is rejected
 *   (m) the trigger rejects a service_role insert against a PENDING membership
 */

import { randomUUID } from 'node:crypto';
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

describe.skipIf(!envReady)('athlete_metric_entries RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let definitionId: string;
  let trainerA: TestUser;
  let trainerB: TestUser;
  let active: TestUser; // ACTIVE in club A
  let pending: TestUser; // PENDING in club A
  let completed: TestUser; // COMPLETED in club A
  let rejected: TestUser; // REJECTED in club A
  let otherClub: TestUser; // ACTIVE in club B only
  let clubA: string;
  let clubB: string;
  let trainerARow: string;
  let trainerBRow: string;
  const m: Record<'active' | 'pending' | 'completed' | 'rejected' | 'otherClub', string> = {
    active: '',
    pending: '',
    completed: '',
    rejected: '',
    otherClub: '',
  };
  let activeEntryId: string;

  const entry = (athleteId: string, membershipId: string, trainerRow: string) => ({
    id: randomUUID(),
    athlete_id: athleteId,
    metric_definition_id: definitionId,
    club_membership_id: membershipId,
    reported_by_club_trainer_id: trainerRow,
    value: 11.42,
    measured_at: new Date().toISOString(),
  });

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    definitionId = await createTestMetricDefinition(svc);
    [trainerA, trainerB, active, pending, completed, rejected, otherClub] = await Promise.all([
      createTestUser(svc, sportId, 'me-ta'),
      createTestUser(svc, sportId, 'me-tb'),
      createTestUser(svc, sportId, 'me-active'),
      createTestUser(svc, sportId, 'me-pending'),
      createTestUser(svc, sportId, 'me-completed'),
      createTestUser(svc, sportId, 'me-rejected'),
      createTestUser(svc, sportId, 'me-other'),
    ]);
    clubA = await createTestClub(svc, 'me-a');
    clubB = await createTestClub(svc, 'me-b');
    trainerARow = await addClubTrainer(svc, clubA, trainerA);
    trainerBRow = await addClubTrainer(svc, clubB, trainerB);

    const mk = (user: TestUser, clubId: string, row: string, status: Parameters<typeof createTestMembership>[1]['status']) =>
      createTestMembership(svc, { clubId, athleteId: user.athleteId, clubTrainerId: row, status });
    m.active = await mk(active, clubA, trainerARow, 'ACTIVE');
    m.pending = await mk(pending, clubA, trainerARow, 'PENDING_ATHLETE_CONFIRMATION');
    m.rejected = await mk(rejected, clubA, trainerARow, 'REJECTED');
    m.otherClub = await mk(otherClub, clubB, trainerBRow, 'ACTIVE');
    // COMPLETED: created ACTIVE so an entry can exist, completed in test (i).
    m.completed = await mk(completed, clubA, trainerARow, 'ACTIVE');
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubA);
    await cleanupTestClub(svc, clubB);
    await deleteTestMetricDefinition(svc, definitionId);
    await Promise.all(
      [trainerA, trainerB, active, pending, completed, rejected, otherClub].map((u) =>
        cleanupTestUser(svc, u),
      ),
    );
    await deleteTestSport(svc, sportId);
  });

  // ── INSERT ──────────────────────────────────────────────────────────────────

  it('(a) allows an ACTIVE-club trainer to INSERT an entry', async () => {
    const row = entry(active.athleteId, m.active, trainerARow);
    const { error } = await trainerA.client.from('athlete_metric_entries').insert(row);
    expect(error).toBeNull();
    activeEntryId = row.id;
  });

  it('(b) denies INSERT for a PENDING_ATHLETE_CONFIRMATION membership', async () => {
    const { error } = await trainerA.client
      .from('athlete_metric_entries')
      .insert(entry(pending.athleteId, m.pending, trainerARow));
    expect(error).not.toBeNull();
  });

  it('(c) denies INSERT for a COMPLETED membership', async () => {
    const id = await createTestMembership(svc, {
      clubId: clubB,
      athleteId: completed.athleteId,
      clubTrainerId: trainerBRow,
      status: 'COMPLETED',
    });
    const { error } = await trainerB.client
      .from('athlete_metric_entries')
      .insert(entry(completed.athleteId, id, trainerBRow));
    expect(error).not.toBeNull();
    await svc.from('club_memberships').delete().eq('id', id);
  });

  it('(d) denies INSERT for a REJECTED membership', async () => {
    const { error } = await trainerA.client
      .from('athlete_metric_entries')
      .insert(entry(rejected.athleteId, m.rejected, trainerARow));
    expect(error).not.toBeNull();
  });

  it("(e) denies a club A trainer reporting for club B's athlete", async () => {
    const ownRow = await trainerA.client
      .from('athlete_metric_entries')
      .insert(entry(otherClub.athleteId, m.otherClub, trainerARow));
    expect(ownRow.error).not.toBeNull();

    const borrowedRow = await trainerA.client
      .from('athlete_metric_entries')
      .insert(entry(otherClub.athleteId, m.otherClub, trainerBRow));
    expect(borrowedRow.error).not.toBeNull();
  });

  it("(f) denies an athlete_id that differs from the membership's athlete", async () => {
    const { error } = await trainerA.client
      .from('athlete_metric_entries')
      .insert(entry(pending.athleteId, m.active, trainerARow));
    expect(error).not.toBeNull();
  });

  // ── SELECT ──────────────────────────────────────────────────────────────────

  it('(g) allows the athlete to read own entries and denies a different athlete', async () => {
    const own = await active.client.from('athlete_metric_entries').select('id').eq('id', activeEntryId);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    const other = await pending.client.from('athlete_metric_entries').select('id').eq('id', activeEntryId);
    expect(other.error).toBeNull();
    expect(other.data).toHaveLength(0);
  });

  it('(h) allows the ACTIVE-club trainer and denies another club’s trainer', async () => {
    const a = await trainerA.client.from('athlete_metric_entries').select('id').eq('id', activeEntryId);
    expect(a.error).toBeNull();
    expect(a.data).toHaveLength(1);

    const b = await trainerB.client.from('athlete_metric_entries').select('id').eq('id', activeEntryId);
    expect(b.error).toBeNull();
    expect(b.data).toHaveLength(0);
  });

  it('(i) removes trainer access once the membership is COMPLETED', async () => {
    const row = entry(completed.athleteId, m.completed, trainerARow);
    const { error: insErr } = await trainerA.client.from('athlete_metric_entries').insert(row);
    expect(insErr).toBeNull();

    const { error: endErr } = await svc
      .from('club_memberships')
      .update({ status: 'COMPLETED', ended_at: new Date().toISOString() })
      .eq('id', m.completed);
    expect(endErr).toBeNull();

    const trainerRead = await trainerA.client.from('athlete_metric_entries').select('id').eq('id', row.id);
    expect(trainerRead.error).toBeNull();
    expect(trainerRead.data).toHaveLength(0);

    const athleteRead = await completed.client.from('athlete_metric_entries').select('id').eq('id', row.id);
    expect(athleteRead.data).toHaveLength(1);
  });

  // ── UPDATE / DELETE ─────────────────────────────────────────────────────────

  it('(j) UPDATE affects 0 rows for clients and is rejected for service_role', async () => {
    for (const user of [active, trainerA]) {
      const { count, error } = await user.client
        .from('athlete_metric_entries')
        .update({ value: 9.99 }, { count: 'exact' })
        .eq('id', activeEntryId);
      expect(error).toBeNull();
      expect(count).toBe(0);
    }
    const { error } = await svc
      .from('athlete_metric_entries')
      .update({ value: 9.99 })
      .eq('id', activeEntryId);
    expect(error).not.toBeNull();
  });

  it('(k) DELETE affects 0 rows for clients', async () => {
    for (const user of [active, trainerA]) {
      const { count, error } = await user.client
        .from('athlete_metric_entries')
        .delete({ count: 'exact' })
        .eq('id', activeEntryId);
      expect(error).toBeNull();
      expect(count).toBe(0);
    }
  });

  // ── NULL / trigger ──────────────────────────────────────────────────────────

  it('(l) rejects a NULL club_membership_id', async () => {
    const { error } = await trainerA.client
      .from('athlete_metric_entries')
      .insert({ ...entry(active.athleteId, m.active, trainerARow), club_membership_id: null });
    expect(error).not.toBeNull();
  });

  it('(m) the trigger rejects a service_role insert against a PENDING membership', async () => {
    const { error } = await svc
      .from('athlete_metric_entries')
      .insert(entry(pending.athleteId, m.pending, trainerARow));
    expect(error).not.toBeNull();
  });
});
