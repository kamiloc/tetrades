/**
 * RLS + constraint tests — club_trainer_invitations (ADR-017)
 * Policies: none for client roles; REVOKE ALL from anon and authenticated
 *   (supabase/policies/club_trainer_invitations.sql)
 * Constraints:
 *   supabase/constraints/club_trainer_invitation_transitions.sql
 *   supabase/constraints/club_trainer_invitation_open_unique.sql (in the migration)
 *
 * Tested criteria:
 *   Transitions (service_role writes, the trigger applies to every writer):
 *     (t1) inserts must be PENDING with no response or redaction
 *     (t2) PENDING → ACCEPTED | DECLINED | REVOKED succeed
 *     (t3) transitions out of terminal states raise
 *     (t4) club_id, invited_by_user_account_id (and expires_at) are immutable
 *     (t5) the only allowed email change is the redaction marker with
 *          redacted_at, and a redacted row never changes its email again
 *   Uniqueness (database level):
 *     (u1) a mixed-case email fails the lowercase CHECK
 *     (u2) a second PENDING row for the same club and email fails
 *     (u3) the same email at another club succeeds; a terminal row frees the slot
 *   Client access:
 *     (c1) the invitee (confirmed email) and a second user read zero rows
 *     (c2) client INSERT, UPDATE and DELETE are denied
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTestClub,
  cleanupTestUser,
  createAdminUser,
  createTestClub,
  createTestSport,
  createTrainerUser,
  createTestUser,
  deleteTestSport,
  envReady,
  getAnonClient,
  getServiceClient,
  type AdminUser,
  type TestUser,
  type TrainerUser,
} from './helpers/setup.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!envReady)('club_trainer_invitations RLS and constraints', () => {
  const svc = getServiceClient();
  let sportId: string;
  let admin: AdminUser;
  let invitee: TrainerUser;
  let other: TestUser;
  let clubA: string;
  let clubB: string;
  const created: string[] = [];

  async function insertInvitation(
    overrides: Record<string, unknown> = {},
  ): Promise<{ id: string; error: { message: string; code?: string } | null }> {
    const id = randomUUID();
    const { error } = await svc.from('club_trainer_invitations').insert({
      id,
      club_id: clubA,
      email: `ana.restrepo.${id.slice(0, 8)}@club.co`,
      status: 'PENDING',
      invited_by_user_account_id: admin.userAccountId,
      expires_at: new Date(Date.now() + 14 * DAY_MS).toISOString(),
      ...overrides,
    });
    if (error === null) created.push(id);
    return { id, error };
  }

  async function pending(overrides: Record<string, unknown> = {}): Promise<string> {
    const { id, error } = await insertInvitation(overrides);
    if (error !== null) throw new Error(`pending fixture: ${error.message}`);
    return id;
  }

  const update = (id: string, patch: Record<string, unknown>) =>
    svc.from('club_trainer_invitations').update(patch).eq('id', id);

  const now = () => new Date().toISOString();

  beforeAll(async () => {
    sportId = await createTestSport(svc);
    [admin, invitee, other] = await Promise.all([
      createAdminUser(svc, 'cti-admin'),
      createTrainerUser(svc, 'cti-invitee'),
      createTestUser(svc, sportId, 'cti-other'),
    ]);
    clubA = await createTestClub(svc, 'cti-a');
    clubB = await createTestClub(svc, 'cti-b');
  });

  afterAll(async () => {
    if (created.length > 0) {
      await svc.from('club_trainer_invitations').delete().in('id', created);
    }
    await cleanupTestClub(svc, clubA);
    await cleanupTestClub(svc, clubB);
    await Promise.all([admin, invitee, other].map((u) => cleanupTestUser(svc, u)));
    await deleteTestSport(svc, sportId);
  });

  // ── Transitions ────────────────────────────────────────────────────────────

  it('(t1) rejects inserts that do not start PENDING and clean', async () => {
    for (const overrides of [
      { status: 'ACCEPTED', accepted_by_user_account_id: invitee.userAccountId, responded_at: now() },
      { status: 'DECLINED', responded_at: now() },
      { status: 'REVOKED', responded_at: now() },
      { responded_at: now() },
      { accepted_by_user_account_id: invitee.userAccountId },
      { redacted_at: now() },
      { email: `redacted:${randomUUID()}` },
    ]) {
      const { error } = await insertInvitation(overrides);
      expect(error, JSON.stringify(overrides)).not.toBeNull();
    }
    const { error } = await insertInvitation();
    expect(error).toBeNull();
  });

  it('(t2) allows the three transitions out of PENDING', async () => {
    const a = await pending();
    expect(
      (await update(a, {
        status: 'ACCEPTED',
        accepted_by_user_account_id: invitee.userAccountId,
        responded_at: now(),
      })).error,
    ).toBeNull();

    const d = await pending();
    expect((await update(d, { status: 'DECLINED', responded_at: now() })).error).toBeNull();

    const r = await pending();
    expect((await update(r, { status: 'REVOKED', responded_at: now() })).error).toBeNull();
  });

  it('(t2) requires the response fields of each transition', async () => {
    const id = await pending();
    expect((await update(id, { status: 'ACCEPTED', responded_at: now() })).error).not.toBeNull();
    expect((await update(id, { status: 'DECLINED' })).error).not.toBeNull();
    expect(
      (await update(id, {
        status: 'REVOKED',
        responded_at: now(),
        accepted_by_user_account_id: invitee.userAccountId,
      })).error,
    ).not.toBeNull();
    expect((await update(id, { responded_at: now() })).error).not.toBeNull();
  });

  it('(t3) never moves a terminal invitation', async () => {
    const id = await pending();
    await update(id, { status: 'DECLINED', responded_at: now() });
    for (const patch of [
      { status: 'PENDING', responded_at: null },
      { status: 'ACCEPTED', accepted_by_user_account_id: invitee.userAccountId },
      { status: 'REVOKED' },
      { responded_at: now() },
    ]) {
      const { error } = await update(id, patch);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
    const { data } = await svc
      .from('club_trainer_invitations')
      .select('status')
      .eq('id', id)
      .single<{ status: string }>();
    expect(data?.status).toBe('DECLINED');
  });

  it('(t4) keeps club_id, invited_by_user_account_id and expires_at immutable', async () => {
    const id = await pending();
    expect((await update(id, { club_id: clubB })).error).not.toBeNull();
    expect((await update(id, { invited_by_user_account_id: other.userAccountId })).error).not.toBeNull();
    expect(
      (await update(id, { expires_at: new Date(Date.now() + 365 * DAY_MS).toISOString() })).error,
    ).not.toBeNull();
  });

  it('(t5) allows only the redaction marker as an email change', async () => {
    const id = await pending();
    expect((await update(id, { email: 'otra.persona@club.co' })).error).not.toBeNull();
    expect((await update(id, { email: `redacted:${id}` })).error).not.toBeNull(); // no redacted_at
    expect((await update(id, { redacted_at: now() })).error).not.toBeNull(); // no marker
    expect((await update(id, { email: `redacted:${randomUUID()}`, redacted_at: now() })).error).not.toBeNull();

    expect((await update(id, { email: `redacted:${id}`, redacted_at: now() })).error).toBeNull();

    // A redacted row never changes its email or redaction time again…
    expect((await update(id, { email: 'ana@club.co', redacted_at: null })).error).not.toBeNull();
    expect((await update(id, { redacted_at: now() })).error).not.toBeNull();
    // …but its status may still close (deletion revokes and redacts).
    expect((await update(id, { status: 'REVOKED', responded_at: now() })).error).toBeNull();
  });

  it('(t5) redacts a terminal invitation without reopening it', async () => {
    const id = await pending();
    await update(id, { status: 'REVOKED', responded_at: now() });
    expect((await update(id, { email: `redacted:${id}`, redacted_at: now() })).error).toBeNull();
  });

  it('(t6) rejects accepting an expired or redacted PENDING invitation; revoking an expired one is allowed', async () => {
    const accept = {
      status: 'ACCEPTED',
      accepted_by_user_account_id: invitee.userAccountId,
      responded_at: now(),
    };
    const expired = await pending({ expires_at: new Date(Date.now() - DAY_MS).toISOString() });
    const expiredAccept = await update(expired, accept);
    expect(expiredAccept.error).not.toBeNull();
    expect(expiredAccept.error?.message).toContain('expired or redacted trainer invitation cannot be accepted');

    const redacted = await pending();
    expect((await update(redacted, { email: `redacted:${redacted}`, redacted_at: now() })).error).toBeNull();
    expect((await update(redacted, accept)).error).not.toBeNull();

    // Deactivation and re-invitation still close expired rows as REVOKED.
    expect((await update(expired, { status: 'REVOKED', responded_at: now() })).error).toBeNull();
  });

  // ── Uniqueness ─────────────────────────────────────────────────────────────

  it('(u1) rejects a mixed-case email (lowercase CHECK)', async () => {
    const { error } = await insertInvitation({ email: 'Ana@Club.co' });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514'); // check_violation
  });

  it('(u2) rejects a second PENDING invitation for the same club and email', async () => {
    const email = `duplicado.${randomUUID().slice(0, 8)}@club.co`;
    await pending({ email });
    const { error } = await insertInvitation({ email });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // unique_violation
  });

  it('(u3) allows the same email at another club, and after a terminal row', async () => {
    const email = `otro.club.${randomUUID().slice(0, 8)}@club.co`;
    const first = await pending({ email });
    expect((await insertInvitation({ email, club_id: clubB })).error).toBeNull();

    await update(first, { status: 'REVOKED', responded_at: now() });
    expect((await insertInvitation({ email })).error).toBeNull();
  });

  // ── Client access ──────────────────────────────────────────────────────────

  it('(c1) returns zero rows to the invitee, another user and anon', async () => {
    const id = await pending({ email: invitee.email.toLowerCase() });
    for (const client of [invitee.client, other.client, admin.client, getAnonClient()]) {
      const { data } = await client.from('club_trainer_invitations').select('id').eq('id', id);
      expect(data ?? []).toHaveLength(0);
    }
  });

  it('(c2) denies client INSERT, UPDATE and DELETE', async () => {
    // Club B: (c1) already holds the PENDING slot for this email at club A.
    const id = await pending({ email: invitee.email.toLowerCase(), club_id: clubB });

    const ins = await invitee.client.from('club_trainer_invitations').insert({
      id: randomUUID(),
      club_id: clubA,
      email: invitee.email.toLowerCase(),
      status: 'PENDING',
      invited_by_user_account_id: admin.userAccountId,
      expires_at: new Date(Date.now() + DAY_MS).toISOString(),
    });
    expect(ins.error).not.toBeNull();

    for (const client of [invitee.client, admin.client]) {
      const up = await client
        .from('club_trainer_invitations')
        .update({ status: 'ACCEPTED' }, { count: 'exact' })
        .eq('id', id);
      expect(up.error !== null || up.count === 0).toBe(true);

      const del = await client.from('club_trainer_invitations').delete({ count: 'exact' }).eq('id', id);
      expect(del.error !== null || del.count === 0).toBe(true);
    }

    const { data } = await svc
      .from('club_trainer_invitations')
      .select('status')
      .eq('id', id)
      .single<{ status: string }>();
    expect(data?.status).toBe('PENDING');
  });
});
