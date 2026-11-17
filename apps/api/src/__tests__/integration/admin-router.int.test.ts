/**
 * admin and trainerInvitation routers over HTTP (ADR-017, design D9/D4):
 * every procedure gets success, Zod-invalid, UNAUTHORIZED, and NOT_FOUND
 * (where it takes an id) coverage, plus FORBIDDEN for non-admins and the
 * `.strict()` slug rule on updateClub. Real Supabase sessions, so the
 * confirmed-email path (ctx.userEmail) runs end to end.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  cleanupTestClub,
  createAuthedUser,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

const UNKNOWN_ID = 'cunknownid000000000000000';

describe.skipIf(!authReady)('admin and trainerInvitation routers', () => {
  let server: TestServer;
  let sportId: string;
  let admin: AuthedUser;
  let athlete: AuthedUser;
  let invitee: AuthedUser;
  let decliner: AuthedUser;
  const clubIds: string[] = [];

  const as = (user?: AuthedUser) => apiClient(server.url, user?.accessToken);
  const anon = () => apiClient(server.url);
  const slug = (label: string) => `liga-${label}-${randomUUID().slice(0, 8)}`;

  async function club(label: string) {
    const created = await as(admin).admin.createClub.mutate({
      slug: slug(label),
      name: `Liga Santandereana de ${label}`,
      countryCode: 'co',
      city: 'Bucaramanga',
    });
    clubIds.push(created.id);
    return created;
  }

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000, sensitive: 100_000 });
    sportId = await createTestSport();
    [admin, athlete, invitee, decliner] = await Promise.all([
      createAuthedUser({ withAthlete: false, role: 'ADMIN', label: 'rt-admin' }),
      createAuthedUser({ sportId, label: 'rt-ath' }),
      createAuthedUser({ withAthlete: false, label: 'rt-inv' }),
      createAuthedUser({ withAthlete: false, label: 'rt-dec' }),
    ]);
  });

  afterAll(async () => {
    for (const id of clubIds) await cleanupTestClub(id);
    for (const user of [admin, athlete, invitee, decliner]) await cleanupAuthedUser(user);
    await deleteTestSport(sportId);
    await server.close();
  });

  // ── admin.* ────────────────────────────────────────────────────────────────

  it('whoAmI: admin true; athlete FORBIDDEN; no session UNAUTHORIZED', async () => {
    expect(await as(admin).admin.whoAmI.query()).toEqual({ isAdmin: true });
    await expectTRPCCode(as(athlete).admin.whoAmI.query(), 'FORBIDDEN');
    await expectTRPCCode(anon().admin.whoAmI.query(), 'UNAUTHORIZED');
  });

  it('createClub: success, invalid input, conflict, forbidden, unauthorized', async () => {
    const created = await club('futbol');
    expect(created).toMatchObject({ countryCode: 'CO', isActive: true, activeTrainerCount: 0 });
    await expectTRPCCode(
      as(admin).admin.createClub.mutate({ slug: 'Bad Slug', name: 'X', countryCode: 'CO' }),
      'BAD_REQUEST',
    );
    await expectTRPCCode(
      as(admin).admin.createClub.mutate({
        slug: created.slug,
        name: 'Repetido',
        countryCode: 'CO',
      }),
      'CONFLICT',
    );
    await expectTRPCCode(
      as(athlete).admin.createClub.mutate({ slug: slug('x'), name: 'Club', countryCode: 'CO' }),
      'FORBIDDEN',
    );
    await expectTRPCCode(
      anon().admin.createClub.mutate({ slug: slug('x'), name: 'Club', countryCode: 'CO' }),
      'UNAUTHORIZED',
    );
  });

  it('updateClub: success; slug key BAD_REQUEST; unknown NOT_FOUND; no session UNAUTHORIZED', async () => {
    const created = await club('tejo');
    const updated = await as(admin).admin.updateClub.mutate({
      clubId: created.id,
      city: 'Floridablanca',
    });
    expect(updated).toMatchObject({ city: 'Floridablanca', slug: created.slug });
    // The cast only gets the forbidden key past the compiler.
    const withSlug = { clubId: created.id, slug: 'otro-slug' } as unknown as { clubId: string };
    await expectTRPCCode(as(admin).admin.updateClub.mutate(withSlug), 'BAD_REQUEST');
    expect((await as(admin).admin.getClub.query({ clubId: created.id })).slug).toBe(created.slug);
    await expectTRPCCode(
      as(admin).admin.updateClub.mutate({ clubId: UNKNOWN_ID, name: 'Nadie' }),
      'NOT_FOUND',
    );
    await expectTRPCCode(
      anon().admin.updateClub.mutate({ clubId: created.id, name: 'X Club' }),
      'UNAUTHORIZED',
    );
  });

  it('listClubs and getClub: success, invalid, not found, unauthorized', async () => {
    const created = await club('ajedrez');
    const page = await as(admin).admin.listClubs.query({ take: 50, status: 'ACTIVE' });
    expect(page.items.map((c) => c.id)).toContain(created.id);
    await expectTRPCCode(as(admin).admin.listClubs.query({ take: 51 }), 'BAD_REQUEST');
    await expectTRPCCode(anon().admin.listClubs.query({}), 'UNAUTHORIZED');

    expect((await as(admin).admin.getClub.query({ clubId: created.id })).id).toBe(created.id);
    await expectTRPCCode(as(admin).admin.getClub.query({ clubId: 'nope' }), 'BAD_REQUEST');
    await expectTRPCCode(as(admin).admin.getClub.query({ clubId: UNKNOWN_ID }), 'NOT_FOUND');
    await expectTRPCCode(anon().admin.getClub.query({ clubId: created.id }), 'UNAUTHORIZED');
  });

  it('deactivateClub and reactivateClub: success, invalid, not found, unauthorized', async () => {
    const created = await club('rugby');
    const result = await as(admin).admin.deactivateClub.mutate({ clubId: created.id });
    expect(result).toMatchObject({
      club: { isActive: false },
      cancelledCertificationRequests: 0,
      rejectedMembershipInvitations: 0,
      revokedTrainerInvitations: 0,
    });
    await expectTRPCCode(
      as(admin).admin.deactivateClub.mutate({ clubId: created.id }),
      'BAD_REQUEST',
    );
    expect((await as(admin).admin.reactivateClub.mutate({ clubId: created.id })).isActive).toBe(
      true,
    );
    for (const procedure of ['deactivateClub', 'reactivateClub'] as const) {
      await expectTRPCCode(as(admin).admin[procedure].mutate({ clubId: 'nope' }), 'BAD_REQUEST');
      await expectTRPCCode(as(admin).admin[procedure].mutate({ clubId: UNKNOWN_ID }), 'NOT_FOUND');
      await expectTRPCCode(anon().admin[procedure].mutate({ clubId: created.id }), 'UNAUTHORIZED');
      await expectTRPCCode(
        as(athlete).admin[procedure].mutate({ clubId: created.id }),
        'FORBIDDEN',
      );
    }
  });

  // ── admin insights (add-web-admin-insights) ────────────────────────────────

  it('getOverview: success; athlete FORBIDDEN; no session UNAUTHORIZED', async () => {
    const overview = await as(admin).admin.getOverview.query();
    expect(overview.generatedAt).toBeInstanceOf(Date);
    expect(overview.activeClubs).toBeGreaterThanOrEqual(0);
    await expectTRPCCode(as(athlete).admin.getOverview.query(), 'FORBIDDEN');
    await expectTRPCCode(anon().admin.getOverview.query(), 'UNAUTHORIZED');
  });

  it('listTrainers: success, invalid, forbidden, unauthorized', async () => {
    const page = await as(admin).admin.listTrainers.query({ access: 'REVOKED', take: 5 });
    for (const item of page.items) expect(item.access).toBe('REVOKED');
    await expectTRPCCode(as(admin).admin.listTrainers.query({ take: 51 }), 'BAD_REQUEST');
    await expectTRPCCode(as(admin).admin.listTrainers.query({ clubQuery: 'a' }), 'BAD_REQUEST');
    await expectTRPCCode(as(athlete).admin.listTrainers.query({}), 'FORBIDDEN');
    await expectTRPCCode(anon().admin.listTrainers.query({}), 'UNAUTHORIZED');
  });

  it('listActions: own club actions as you; invalid, forbidden, unauthorized', async () => {
    const created = await club('beisbol');
    const page = await as(admin).admin.listActions.query({ clubId: created.id });
    expect(page.items).toEqual([
      expect.objectContaining({
        action: 'CLUB_CREATED',
        club: { id: created.id, name: created.name },
        actor: { isYou: true, email: null },
      }),
    ]);
    await expectTRPCCode(as(admin).admin.listActions.query({ take: 51 }), 'BAD_REQUEST');
    await expectTRPCCode(as(admin).admin.listActions.query({ clubId: 'nope' }), 'BAD_REQUEST');
    await expectTRPCCode(as(athlete).admin.listActions.query({}), 'FORBIDDEN');
    await expectTRPCCode(anon().admin.listActions.query({}), 'UNAUTHORIZED');
  });

  it('listClubs: search and trainer filter; a 1-character query is BAD_REQUEST', async () => {
    const created = await club('softbol');
    const page = await as(admin).admin.listClubs.query({
      query: created.slug,
      status: 'ACTIVE',
      withoutActiveTrainer: true,
    });
    expect(page.items.map((c) => c.id)).toEqual([created.id]);
    await expectTRPCCode(as(admin).admin.listClubs.query({ query: 'x' }), 'BAD_REQUEST');
  });

  // ── trainer provisioning end to end ────────────────────────────────────────

  it('inviteTrainer → listMine → accept → listClubTrainers → revokeTrainer, with real sessions', async () => {
    const created = await club('ciclismo');
    // The session email is confirmed (createAuthedUser sets email_confirm).
    const invitation = await as(admin).admin.inviteTrainer.mutate({
      clubId: created.id,
      email: invitee.email.toUpperCase(),
    });
    expect(invitation.state).toBe('PENDING');

    const mine = await as(invitee).trainerInvitation.listMine.query();
    expect(mine.items.map((i) => i.id)).toEqual([invitation.id]);
    expect(mine.items[0]?.club).toMatchObject({ id: created.id, isActive: true });
    expect((await as(decliner).trainerInvitation.listMine.query()).items).toEqual([]);
    await expectTRPCCode(
      as(decliner).trainerInvitation.accept.mutate({ invitationId: invitation.id }),
      'NOT_FOUND',
    );
    await expectTRPCCode(
      as(athlete).trainerInvitation.accept.mutate({ invitationId: invitation.id }),
      'NOT_FOUND',
    );

    expect(
      await as(invitee).trainerInvitation.accept.mutate({ invitationId: invitation.id }),
    ).toEqual({
      id: invitation.id,
      state: 'ACCEPTED',
      clubId: created.id,
    });
    // Now a trainer: the trainer procedures accept the caller.
    expect((await as(invitee).club.listRoster.query({ clubId: created.id })).items).toEqual([]);

    const trainers = await as(admin).admin.listClubTrainers.query({ clubId: created.id });
    expect(trainers.items).toEqual([
      expect.objectContaining({ status: 'ACTIVE', invitedEmail: invitee.email.toLowerCase() }),
    ]);
    const trainerId = trainers.items[0]?.id ?? '';

    const revoked = await as(admin).admin.revokeTrainer.mutate({ clubTrainerId: trainerId });
    expect(revoked).toMatchObject({ id: trainerId, status: 'REVOKED' });
    await expectTRPCCode(as(invitee).club.listRoster.query({ clubId: created.id }), 'FORBIDDEN');
    await expectTRPCCode(
      as(admin).admin.revokeTrainer.mutate({ clubTrainerId: trainerId }),
      'BAD_REQUEST',
    );
  });

  it('decline, and revokeTrainerInvitation', async () => {
    const created = await club('natacion');
    const toDecline = await as(admin).admin.inviteTrainer.mutate({
      clubId: created.id,
      email: decliner.email,
    });
    expect(
      await as(decliner).trainerInvitation.decline.mutate({ invitationId: toDecline.id }),
    ).toEqual({
      id: toDecline.id,
      state: 'DECLINED',
    });
    await expectTRPCCode(
      as(decliner).trainerInvitation.decline.mutate({ invitationId: toDecline.id }),
      'NOT_FOUND',
    );

    const toRevoke = await as(admin).admin.inviteTrainer.mutate({
      clubId: created.id,
      email: decliner.email,
    });
    expect(
      await as(admin).admin.revokeTrainerInvitation.mutate({ invitationId: toRevoke.id }),
    ).toEqual({ id: toRevoke.id, state: 'REVOKED' });

    const invitations = await as(admin).admin.listClubTrainerInvitations.query({
      clubId: created.id,
    });
    expect(invitations.items.map((i) => i.state)).toEqual(['REVOKED', 'DECLINED']);
    expect(invitations.items.every((i) => i.email === decliner.email.toLowerCase())).toBe(true);
  });

  it('trainer procedures: invalid input, not found, unauthorized, forbidden', async () => {
    const created = await club('boxeo');
    // inviteTrainer
    await expectTRPCCode(
      as(admin).admin.inviteTrainer.mutate({ clubId: created.id, email: 'no-es-un-correo' }),
      'BAD_REQUEST',
    );
    await expectTRPCCode(
      as(admin).admin.inviteTrainer.mutate({ clubId: UNKNOWN_ID, email: 'ana@club.co' }),
      'NOT_FOUND',
    );
    await expectTRPCCode(
      anon().admin.inviteTrainer.mutate({ clubId: created.id, email: 'ana@club.co' }),
      'UNAUTHORIZED',
    );
    await expectTRPCCode(
      as(athlete).admin.inviteTrainer.mutate({ clubId: created.id, email: 'ana@club.co' }),
      'FORBIDDEN',
    );
    // revokeTrainerInvitation / revokeTrainer
    await expectTRPCCode(
      as(admin).admin.revokeTrainerInvitation.mutate({ invitationId: 'nope' }),
      'BAD_REQUEST',
    );
    await expectTRPCCode(
      as(admin).admin.revokeTrainerInvitation.mutate({ invitationId: UNKNOWN_ID }),
      'NOT_FOUND',
    );
    await expectTRPCCode(
      anon().admin.revokeTrainerInvitation.mutate({ invitationId: UNKNOWN_ID }),
      'UNAUTHORIZED',
    );
    await expectTRPCCode(
      as(admin).admin.revokeTrainer.mutate({ clubTrainerId: 'nope' }),
      'BAD_REQUEST',
    );
    await expectTRPCCode(
      as(admin).admin.revokeTrainer.mutate({ clubTrainerId: UNKNOWN_ID }),
      'NOT_FOUND',
    );
    await expectTRPCCode(
      anon().admin.revokeTrainer.mutate({ clubTrainerId: UNKNOWN_ID }),
      'UNAUTHORIZED',
    );
    // list procedures
    for (const procedure of ['listClubTrainers', 'listClubTrainerInvitations'] as const) {
      await expectTRPCCode(
        as(admin).admin[procedure].query({ clubId: created.id, take: 51 }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(as(admin).admin[procedure].query({ clubId: UNKNOWN_ID }), 'NOT_FOUND');
      await expectTRPCCode(anon().admin[procedure].query({ clubId: created.id }), 'UNAUTHORIZED');
    }
    // trainerInvitation.*
    await expectTRPCCode(anon().trainerInvitation.listMine.query(), 'UNAUTHORIZED');
    for (const procedure of ['accept', 'decline'] as const) {
      await expectTRPCCode(
        as(invitee).trainerInvitation[procedure].mutate({ invitationId: 'nope' }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        as(invitee).trainerInvitation[procedure].mutate({ invitationId: UNKNOWN_ID }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        anon().trainerInvitation[procedure].mutate({ invitationId: UNKNOWN_ID }),
        'UNAUTHORIZED',
      );
    }
  });

  it('records each successful admin write, never an email', async () => {
    const rows = await prisma.adminActionLog.findMany({
      where: { actorUserAccountId: admin.userAccountId },
      select: { action: true, metadata: true },
    });
    expect(new Set(rows.map((r) => r.action))).toEqual(
      new Set([
        'CLUB_CREATED',
        'CLUB_UPDATED',
        'CLUB_DEACTIVATED',
        'CLUB_REACTIVATED',
        'TRAINER_INVITED',
        'TRAINER_INVITATION_REVOKED',
        'TRAINER_REVOKED',
      ]),
    );
    expect(JSON.stringify(rows)).not.toMatch(/@/);
  });
});
