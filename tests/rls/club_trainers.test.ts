/**
 * RLS tests — club_trainers table
 * Policies:
 *   club_trainers_select_own (user_account_id resolves to the caller)
 *   (no INSERT / UPDATE / DELETE policy — service_role only)
 *
 * Tested criteria:
 *   (a) a trainer can SELECT their own row
 *   (b) a peer trainer of the same club cannot SELECT another trainer's row
 *   (c) an athlete with no trainer rows sees nothing
 *   (d) anon sees nothing
 *   (e) a user cannot INSERT a row making themselves a trainer
 *   (f) a trainer cannot UPDATE their row to another club
 *   (g) a trainer cannot DELETE their row
 *   NULL safety: user_account_id and club_id are NOT NULL; (h) asserts an
 *   INSERT with NULL user_account_id is rejected even for service_role.
 *   (i) one capacity per account (account_single_capacity.sql): a trainer row
 *       for an athlete or ADMIN account is rejected for every writer
 *   (j) a revoked row stays visible to its owner (history)
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addClubTrainer,
  cleanupTestClub,
  cleanupTestUser,
  createTestClub,
  createTestSport,
  createTestUser,
  createTrainerUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  setTestTrainerRevoked,
  createAdminUser,
  type TestUser,
  type TrainerUser,
} from './helpers/setup.js';

describe.skipIf(!envReady)('club_trainers RLS', () => {
  const svc = getServiceClient();
  let sportId: string;
  let trainer1: TrainerUser;
  let trainer2: TrainerUser;
  let athlete: TestUser;
  let clubA: string;
  let clubB: string;
  let trainer1RowId: string;
  let trainer2RowId: string;

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [trainer1, trainer2, athlete] = await Promise.all([
      createTrainerUser(svc, 'ct-t1'),
      createTrainerUser(svc, 'ct-t2'),
      createTestUser(svc, sportId, 'ct-ath'),
    ]);
    clubA = await createTestClub(svc, 'ct-a');
    clubB = await createTestClub(svc, 'ct-b');
    trainer1RowId = await addClubTrainer(svc, clubA, trainer1);
    trainer2RowId = await addClubTrainer(svc, clubA, trainer2);
  });

  afterAll(async () => {
    await cleanupTestClub(svc, clubA);
    await cleanupTestClub(svc, clubB);
    await Promise.all([
      cleanupTestUser(svc, trainer1),
      cleanupTestUser(svc, trainer2),
      cleanupTestUser(svc, athlete),
    ]);
    await deleteTestSport(svc, sportId);
  });

  it('(a) allows a trainer to SELECT their own row', async () => {
    const { data, error } = await trainer1.client
      .from('club_trainers')
      .select('id')
      .eq('id', trainer1RowId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('(b) denies a peer trainer of the same club', async () => {
    const { data, error } = await trainer1.client
      .from('club_trainers')
      .select('id')
      .eq('id', trainer2RowId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(c) shows an athlete with no trainer rows nothing for the club', async () => {
    const { data, error } = await athlete.client
      .from('club_trainers')
      .select('id')
      .eq('club_id', clubA);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(d) shows anon nothing', async () => {
    const { data, error } = await getAnonClient()
      .from('club_trainers')
      .select('id')
      .eq('club_id', clubA);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('(e) denies self-promotion to trainer via INSERT', async () => {
    const { error } = await athlete.client.from('club_trainers').insert({
      id: randomUUID(),
      club_id: clubA,
      user_account_id: athlete.userAccountId,
    });
    expect(error).not.toBeNull();
  });

  it('(f) denies a trainer moving their row to another club', async () => {
    const { count, error } = await trainer1.client
      .from('club_trainers')
      .update({ club_id: clubB }, { count: 'exact' })
      .eq('id', trainer1RowId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(g) denies a trainer deleting their row', async () => {
    const { count, error } = await trainer1.client
      .from('club_trainers')
      .delete({ count: 'exact' })
      .eq('id', trainer1RowId);
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('(h) rejects a NULL user_account_id even for service_role', async () => {
    const { error } = await svc
      .from('club_trainers')
      .insert({ id: randomUUID(), club_id: clubA, user_account_id: null });
    expect(error).not.toBeNull();
  });

  // ── One capacity per account (ADR-017, account_single_capacity.sql) ─────────

  it('(i) rejects a service_role trainer row for an athlete account', async () => {
    const { error } = await svc
      .from('club_trainers')
      .insert({ id: randomUUID(), club_id: clubB, user_account_id: athlete.userAccountId });
    expect(error).not.toBeNull();
    expect(error?.message).toContain('athlete account cannot be a club trainer');
  });

  it('(i) rejects a service_role trainer row for an ADMIN account', async () => {
    const admin = await createAdminUser(svc, 'ct-admin');
    try {
      const { error } = await svc
        .from('club_trainers')
        .insert({ id: randomUUID(), club_id: clubB, user_account_id: admin.userAccountId });
      expect(error).not.toBeNull();
      expect(error?.message).toContain('admin account cannot be a club trainer');
    } finally {
      await cleanupTestUser(svc, admin);
    }
  });

  it('(i) rejects moving a trainer row onto an athlete account', async () => {
    const { error } = await svc
      .from('club_trainers')
      .update({ user_account_id: athlete.userAccountId })
      .eq('id', trainer2RowId);
    expect(error).not.toBeNull();
  });

  it('(i) accepts a second club for a trainer-only account', async () => {
    const id = randomUUID();
    const { error } = await svc
      .from('club_trainers')
      .insert({ id, club_id: clubB, user_account_id: trainer1.userAccountId });
    expect(error).toBeNull();
    await svc.from('club_trainers').delete().eq('id', id);
  });

  it('(j) keeps a revoked row visible to its owner', async () => {
    await setTestTrainerRevoked(svc, trainer1RowId, true);
    try {
      const { data, error } = await trainer1.client
        .from('club_trainers')
        .select('id, revoked_at')
        .eq('id', trainer1RowId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.revoked_at).not.toBeNull();
    } finally {
      await setTestTrainerRevoked(svc, trainer1RowId, false);
    }
  });
});
