/**
 * adminProcedure (ADR-017, design D1; platform-admin-access spec) against the
 * real database: the role is read fresh from user_accounts on every call.
 *
 * A one-procedure router built on adminProcedure is called through
 * createCaller with the real Prisma client, so the check runs exactly as in
 * production without depending on the admin router. HTTP-level coverage of
 * the admin router itself lives with that router.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Context } from '../../context.js';
import { adminProcedure, router } from '../../trpc.js';

import {
  addClubTrainer,
  cleanupFixtureAthlete,
  cleanupFixtureTrainer,
  cleanupTestClub,
  createFixtureAthlete,
  createFixtureTrainer,
  createTestClub,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
  type FixtureAthlete,
  type FixtureTrainer,
} from './helpers/setup.js';

const probeRouter = router({
  probe: adminProcedure.query(({ ctx }) => ctx.admin),
});

function callerFor(supabaseUserId: string | null) {
  const ctx: Context = {
    prisma,
    userId: supabaseUserId,
    userEmail: null,
    supabase: {} as Context['supabase'],
    requestId: `req-admin-${randomUUID().slice(0, 8)}`,
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Context['log'],
    jobs: { enqueue: vi.fn() },
  };
  return probeRouter.createCaller(ctx);
}

async function expectCode(call: Promise<unknown>, code: TRPCError['code']): Promise<void> {
  const error: unknown = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
}

async function accountWithRole(role: 'ADMIN' | 'SYSTEM') {
  const supabaseUserId = randomUUID();
  const { id } = await prisma.userAccount.create({
    data: { supabaseUserId, role, status: 'ACTIVE' },
    select: { id: true },
  });
  return { supabaseUserId, userAccountId: id };
}

async function supabaseIdOf(userAccountId: string): Promise<string> {
  const { supabaseUserId } = await prisma.userAccount.findUniqueOrThrow({
    where: { id: userAccountId },
    select: { supabaseUserId: true },
  });
  return supabaseUserId;
}

describe.skipIf(!dbReady)('adminProcedure', () => {
  let sportId: string;
  let clubId: string;
  let admin: { supabaseUserId: string; userAccountId: string };
  let system: { supabaseUserId: string; userAccountId: string };
  let athlete: FixtureAthlete;
  let trainer: FixtureTrainer;

  beforeAll(async () => {
    sportId = await createTestSport();
    clubId = await createTestClub('adm-proc');
    [admin, system, athlete, trainer] = await Promise.all([
      accountWithRole('ADMIN'),
      accountWithRole('SYSTEM'),
      createFixtureAthlete(sportId),
      createFixtureTrainer(),
    ]);
    await addClubTrainer(clubId, trainer.userAccountId);
  });

  afterAll(async () => {
    await cleanupTestClub(clubId);
    await cleanupFixtureAthlete(athlete);
    await cleanupFixtureTrainer(trainer);
    await prisma.userAccount.deleteMany({
      where: { id: { in: [admin.userAccountId, system.userAccountId] } },
    });
    await deleteTestSport(sportId);
  });

  it('lets an ADMIN account through and passes its account id as ctx.admin', async () => {
    expect(await callerFor(admin.supabaseUserId).probe()).toEqual({
      userAccountId: admin.userAccountId,
    });
  });

  it('rejects ATHLETE, SYSTEM and trainer accounts as FORBIDDEN', async () => {
    await expectCode(callerFor(await supabaseIdOf(athlete.userAccountId)).probe(), 'FORBIDDEN');
    await expectCode(callerFor(system.supabaseUserId).probe(), 'FORBIDDEN');
    await expectCode(callerFor(await supabaseIdOf(trainer.userAccountId)).probe(), 'FORBIDDEN');
  });

  it('rejects a session with no account row as FORBIDDEN', async () => {
    await expectCode(callerFor(randomUUID()).probe(), 'FORBIDDEN');
  });

  it('rejects a call without a session as UNAUTHORIZED', async () => {
    await expectCode(callerFor(null).probe(), 'UNAUTHORIZED');
  });

  it('enforces a role change in the database on the very next call', async () => {
    const caller = callerFor(admin.supabaseUserId);
    await caller.probe();
    await prisma.userAccount.update({
      where: { id: admin.userAccountId },
      data: { role: 'ATHLETE' },
      select: { id: true },
    });
    try {
      await expectCode(caller.probe(), 'FORBIDDEN');
    } finally {
      await prisma.userAccount.update({
        where: { id: admin.userAccountId },
        data: { role: 'ADMIN' },
        select: { id: true },
      });
    }
    await expect(caller.probe()).resolves.toEqual({ userAccountId: admin.userAccountId });
  });
});
