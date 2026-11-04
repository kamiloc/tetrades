/**
 * athlete.bootstrap and one capacity per account (ADR-017, design D12;
 * platform-admin-access spec "An account acts in exactly one capacity").
 *
 * An ADMIN account and a trainer account (even a revoked one) are rejected
 * as FORBIDDEN and no athlete row is created. A plain new account still
 * onboards.
 */
import './helpers/load-env.js';

import {
  NON_ATHLETE_ACCOUNT_ONBOARDING_MESSAGE,
  TRAINER_ACCOUNT_ONBOARDING_MESSAGE,
} from '@packages/shared-logic';
import { TRPCClientError } from '@trpc/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAthleteRows,
  cleanupAuthedUser,
  cleanupTestClub,
  createAuthedUser,
  createTestClub,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

describe.skipIf(!authReady)('athlete.bootstrap — one capacity per account', () => {
  let server: TestServer;
  let sportId: string;
  let clubId: string;
  let admin: AuthedUser;
  let revokedTrainer: AuthedUser;
  let newcomer: AuthedUser;

  const input = () => ({
    displayName: 'Mariana Pajón Londoño',
    sportId,
    countryCode: 'CO',
  });

  const athleteCount = (user: AuthedUser) =>
    prisma.athlete.count({ where: { userAccountId: user.userAccountId } });

  async function messageOf(call: Promise<unknown>): Promise<string> {
    const error: unknown = await call.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(TRPCClientError);
    return (error as TRPCClientError<never>).message;
  }

  beforeAll(async () => {
    server = await startServer({ public: 100_000, authenticated: 100_000 });
    sportId = await createTestSport();
    clubId = await createTestClub('boot-cap');
    [admin, revokedTrainer, newcomer] = await Promise.all([
      createAuthedUser({ withAthlete: false, role: 'ADMIN', label: 'boot-admin' }),
      createAuthedUser({ withAthlete: false, label: 'boot-trainer' }),
      createAuthedUser({ withAthlete: false, label: 'boot-new' }),
    ]);
    const row = await addClubTrainer(clubId, revokedTrainer.userAccountId);
    await prisma.clubTrainer.update({
      where: { id: row },
      data: { revokedAt: new Date() },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await cleanupTestClub(clubId);
    // bootstrap created the newcomer's athlete after the fixture was made.
    const created = await prisma.athlete.findUnique({
      where: { userAccountId: newcomer.userAccountId },
      select: { id: true },
    });
    if (created !== null) await cleanupAthleteRows(created.id);
    for (const user of [admin, revokedTrainer, newcomer]) await cleanupAuthedUser(user);
    await deleteTestSport(sportId);
    await server.close();
  });

  it('rejects an ADMIN account as FORBIDDEN and creates no athlete', async () => {
    const call = apiClient(server.url, admin.accessToken).athlete.bootstrap.mutate(input());
    await expectTRPCCode(call, 'FORBIDDEN');
    expect(
      await messageOf(apiClient(server.url, admin.accessToken).athlete.bootstrap.mutate(input())),
    ).toBe(NON_ATHLETE_ACCOUNT_ONBOARDING_MESSAGE);
    expect(await athleteCount(admin)).toBe(0);
  });

  it('rejects a revoked trainer account as FORBIDDEN with the trainer message', async () => {
    const call = apiClient(server.url, revokedTrainer.accessToken).athlete.bootstrap.mutate(input());
    await expectTRPCCode(call, 'FORBIDDEN');
    expect(
      await messageOf(
        apiClient(server.url, revokedTrainer.accessToken).athlete.bootstrap.mutate(input()),
      ),
    ).toBe(TRAINER_ACCOUNT_ONBOARDING_MESSAGE);
    expect(await athleteCount(revokedTrainer)).toBe(0);
  });

  it('still onboards a plain new account', async () => {
    const result = await apiClient(server.url, newcomer.accessToken).athlete.bootstrap.mutate(
      input(),
    );
    expect(result.athleteId).toEqual(expect.any(String));
    expect(await athleteCount(newcomer)).toBe(1);
  });
});
