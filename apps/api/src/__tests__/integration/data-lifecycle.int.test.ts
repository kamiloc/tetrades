/**
 * Habeas Data deletion (tasks 6.2–6.5, athlete-data-lifecycle spec,
 * design D8a tombstone) against the real DB, real Supabase Storage, and real
 * Supabase auth. No Prisma mocks. The only substitutes are:
 *   - a recording job port for athlete.requestDeletion (to prove the row
 *     exists before the job is enqueued, without running workers), and
 *   - wrapped DeletionExternals that fail or skip on purpose, for the
 *     failed-verification and retry cases.
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import type { QueueJobData, QueueName } from '@packages/queue';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';
import { createSupabaseDeletionExternals, type DeletionExternals } from '../../lib/supabaseAdmin.js';
import {
  DELETED_DISPLAY_NAME,
  runPiiDeletion,
  tombstoneSlug,
  tombstoneSupabaseUserId,
  type DeletionLogger,
} from '../../services/dataLifecycle.js';

import {
  addClubTrainer,
  apiClient,
  authReady,
  cleanupAthleteRows,
  cleanupAuthedUser,
  cleanupFixtureAthlete,
  cleanupTestClub,
  createAuthedUser,
  createFixtureAthlete,
  createTestClub,
  createTestMembership,
  createTestMetricDefinition,
  createTestSport,
  deleteTestMetricDefinition,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  startServer,
  type AuthedUser,
  type FixtureAthlete,
  type TestServer,
} from './helpers/setup.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function athleteIdOf(user: AuthedUser): string {
  if (user.athleteId === null) throw new Error('fixture invariant: user has an athlete');
  return user.athleteId;
}

interface LogLine {
  level: 'info' | 'warn' | 'error';
  obj: Record<string, unknown>;
  msg: string | undefined;
}

function captureLogger(): DeletionLogger & { lines: LogLine[] } {
  const lines: LogLine[] = [];
  const at = (level: LogLine['level']) => (obj: Record<string, unknown>, msg?: string) => {
    lines.push({ level, obj, msg });
  };
  return { lines, info: at('info'), warn: at('warn'), error: at('error') };
}

const storageAdmin = () =>
  createClient(process.env['SUPABASE_URL'] ?? '', process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from('profile-photos');

async function uploadPhoto(athleteId: string, name: string): Promise<void> {
  const { error } = await storageAdmin().upload(`${athleteId}/${name}`, Buffer.from('test-image'), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error !== null) throw new Error(`upload ${name}: ${error.message}`);
}

async function authUserExists(supabaseUserId: string): Promise<boolean> {
  const admin = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin.auth.admin.getUserById(supabaseUserId);
  return data.user !== null;
}

async function createDeletionRequest(athleteId: string, userAccountId: string): Promise<string> {
  const row = await prisma.dataLifecycleRequest.create({
    data: { athleteId, requestedBy: userAccountId, requestType: 'DELETION' },
    select: { id: true },
  });
  return row.id;
}

/** Teardown for a (possibly tombstoned) athlete, including retained rows. */
async function purgeAthlete(athleteId: string, userAccountId: string, supabaseUserId?: string) {
  await prisma.piiConsentLog.deleteMany({ where: { athleteId } });
  await prisma.dataLifecycleRequest.deleteMany({ where: { athleteId } });
  // Not covered by cleanupAthleteRows; the avatar link must go before the assets.
  await prisma.athletePublicProfile.updateMany({ where: { athleteId }, data: { avatarAssetId: null } });
  await prisma.profilePhotoAsset.deleteMany({ where: { athleteId } });
  await cleanupAthleteRows(athleteId);
  await prisma.clubTrainer.deleteMany({ where: { userAccountId } });
  await prisma.deviceToken.deleteMany({ where: { userAccountId } });
  await prisma.auditEvent.deleteMany({ where: { actorUserAccountId: userAccountId } });
  await prisma.userAccount.deleteMany({ where: { id: userAccountId } });
  const paths = await createSupabaseDeletionExternals().listStorageObjects(`${athleteId}/`);
  if (paths.length > 0) await storageAdmin().remove(paths);
  if (supabaseUserId !== undefined) {
    await createSupabaseDeletionExternals().deleteAuthUser(supabaseUserId);
  }
}

// ── 6.2 athlete.requestDeletion ────────────────────────────────────────────

describe.skipIf(!authReady)('athlete.requestDeletion', () => {
  interface Enqueued {
    queue: QueueName;
    data: QueueJobData[QueueName];
    rowExisted: boolean;
  }
  const enqueued: Enqueued[] = [];
  const recorder: JobEnqueuer = {
    async enqueue(queue, data) {
      const id = 'dataLifecycleRequestId' in data ? data.dataLifecycleRequestId : '';
      const row = await prisma.dataLifecycleRequest.findUnique({ where: { id }, select: { id: true } });
      enqueued.push({ queue, data, rowExisted: row !== null });
    },
  };
  const failing: JobEnqueuer = { enqueue: () => Promise.reject(new Error('redis down')) };

  let server: TestServer;
  let failingServer: TestServer;
  let sportId: string;
  let owner: AuthedUser;
  let other: AuthedUser;

  beforeAll(async () => {
    server = await startServer({ authenticated: 100_000, sensitive: 100_000 }, { jobs: recorder });
    failingServer = await startServer({ authenticated: 100_000, sensitive: 100_000 }, { jobs: failing });
    sportId = await createTestSport();
    owner = await createAuthedUser({ sportId, label: 'del-owner' });
    other = await createAuthedUser({ sportId, label: 'del-other' });
  });

  afterAll(async () => {
    for (const u of [owner, other]) {
      await prisma.dataLifecycleRequest.deleteMany({ where: { athleteId: athleteIdOf(u) } });
      await cleanupAuthedUser(u);
    }
    await deleteTestSport(sportId);
    await server.close();
    await failingServer.close();
  });

  it('records a REQUESTED deletion and enqueues the job only after the row exists', async () => {
    const result = await apiClient(server.url, owner.accessToken).athlete.requestDeletion.mutate({});
    expect(result.requestType).toBe('DELETION');
    expect(result.status).toBe('REQUESTED');

    expect(enqueued).toHaveLength(1);
    const job = enqueued[0];
    expect(job?.queue).toBe('pii-deletion');
    expect(job?.rowExisted).toBe(true);
    expect(job?.data).toMatchObject({
      dataLifecycleRequestId: result.id,
      athleteId: athleteIdOf(owner),
    });
    expect(job?.data.requestId.length).toBeGreaterThan(0);
    // Identifiers only — nothing else travels through Redis.
    expect(Object.keys(job?.data ?? {}).sort()).toEqual(
      ['athleteId', 'dataLifecycleRequestId', 'requestId', 'requestedAt'],
    );
  });

  it('reuses an unfinished request and re-enqueues it', async () => {
    const before = enqueued.length;
    const first = await prisma.dataLifecycleRequest.findFirstOrThrow({
      where: { athleteId: athleteIdOf(owner), requestType: 'DELETION' },
      select: { id: true },
    });
    const again = await apiClient(server.url, owner.accessToken).athlete.requestDeletion.mutate({});
    expect(again.id).toBe(first.id);
    expect(enqueued).toHaveLength(before + 1);
    expect(
      await prisma.dataLifecycleRequest.count({ where: { athleteId: athleteIdOf(owner), requestType: 'DELETION' } }),
    ).toBe(1);
  });

  it("cannot target another athlete's data (an injected athleteId is ignored)", async () => {
    // Not part of the input; a non-literal object skips the excess-property
    // check so the injected id actually reaches the server.
    const injected = { athleteId: athleteIdOf(other) };
    const result = await apiClient(server.url, owner.accessToken).athlete.requestDeletion.mutate(injected);
    const row = await prisma.dataLifecycleRequest.findUniqueOrThrow({
      where: { id: result.id },
      select: { athleteId: true },
    });
    expect(row.athleteId).toBe(athleteIdOf(owner));
    expect(await prisma.dataLifecycleRequest.count({ where: { athleteId: athleteIdOf(other) } })).toBe(0);
  });

  it('keeps the request recoverable when enqueueing fails', async () => {
    await expectTRPCCode(
      apiClient(failingServer.url, other.accessToken).athlete.requestDeletion.mutate({}),
      'INTERNAL_SERVER_ERROR',
    );
    const row = await prisma.dataLifecycleRequest.findFirstOrThrow({
      where: { athleteId: athleteIdOf(other) },
      select: { id: true, status: true },
    });
    expect(row.status).toBe('REQUESTED');

    const retried = await apiClient(server.url, other.accessToken).athlete.requestDeletion.mutate({});
    expect(retried.id).toBe(row.id);
    expect(enqueued.at(-1)?.data).toMatchObject({ dataLifecycleRequestId: row.id });
  });

  it('rejects invalid input', async () => {
    await expectTRPCCode(
      // A non-object; the cast only gets it past the compiler so Zod rejects it at runtime.
      apiClient(server.url, owner.accessToken).athlete.requestDeletion.mutate(
        'everything' as unknown as Record<string, never>,
      ),
      'BAD_REQUEST',
    );
  });

  it('is UNAUTHORIZED without a token', async () => {
    await expectTRPCCode(apiClient(server.url).athlete.requestDeletion.mutate({}), 'UNAUTHORIZED');
  });

  it('is NOT_FOUND for a caller without an athlete profile', async () => {
    const noAthlete = await createAuthedUser({ withAthlete: false, label: 'del-noath' });
    try {
      await expectTRPCCode(
        apiClient(server.url, noAthlete.accessToken).athlete.requestDeletion.mutate({}),
        'NOT_FOUND',
      );
    } finally {
      await cleanupAuthedUser(noAthlete);
    }
  });
});

// ── 6.3–6.5 deletePII worker logic ─────────────────────────────────────────

// Each case seeds every athlete-FK table, then runs the full cascade with
// Storage and auth calls over the hosted pooler; 60s is too tight.
describe.skipIf(!authReady)('runPiiDeletion', { timeout: 180_000 }, () => {
  let sportId: string;
  let definitionId: string;
  let clubId: string;
  let ownClubId: string;
  let trainer: FixtureAthlete; // trains clubId
  let friend: FixtureAthlete; // ACCEPTED connection; also coached by the deleted athlete
  let trainerRow: string;
  const real = createSupabaseDeletionExternals();

  beforeAll(async () => {
    sportId = await createTestSport();
    definitionId = await createTestMetricDefinition();
    [trainer, friend] = await Promise.all([createFixtureAthlete(sportId), createFixtureAthlete(sportId)]);
    clubId = await createTestClub('del');
    ownClubId = await createTestClub('del-own');
    trainerRow = await addClubTrainer(clubId, trainer.userAccountId);
  });

  afterAll(async () => {
    await cleanupTestClub(clubId);
    await cleanupTestClub(ownClubId);
    await deleteTestMetricDefinition(definitionId);
    for (const fx of [trainer, friend]) await cleanupFixtureAthlete(fx);
    await deleteTestSport(sportId);
  });

  /** An athlete with a row in every athlete-FK table and a Storage photo. */
  async function populatedAthlete(label: string) {
    const user = await createAuthedUser({ sportId, label });
    const athleteId = athleteIdOf(user);

    await prisma.athleteAchievement.create({
      data: { athleteId, title: 'Campeonato Nacional Sub-20', organization: 'Fedeatletismo', achievedOn: new Date('2025-08-10') },
      select: { id: true },
    });
    await prisma.athleteConnection.create({
      data: { requesterId: athleteId, addresseeId: friend.athleteId, status: 'ACCEPTED' },
      select: { id: true },
    });
    await prisma.athletePublicProfile.update({
      where: { athleteId: friend.athleteId },
      data: { connectionCountCache: 1 },
      select: { athleteId: true },
    });
    const photo = await prisma.profilePhotoAsset.create({
      data: { athleteId, variant: 'THUMB_150', objectPath: `${athleteId}/thumb-150.webp`, width: 150, height: 150, processingStatus: 'READY' },
      select: { id: true },
    });
    await prisma.athletePublicProfile.update({
      where: { athleteId },
      data: { avatarAssetId: photo.id },
      select: { athleteId: true },
    });
    await prisma.piiConsentLog.create({
      data: { athleteId, purposeCode: 'profile_public', consentVersion: 'v1', granted: true },
      select: { id: true },
    });
    await prisma.auditEvent.create({
      data: {
        actorUserAccountId: user.userAccountId, athleteId, eventType: 'DECRYPT_PII',
        targetType: 'athlete_private_profiles', targetId: athleteId,
        purposeCode: 'athlete_viewed_own_profile', requestId: randomUUID(),
      },
      select: { id: true },
    });
    await prisma.dataLifecycleRequest.create({
      data: { athleteId, requestedBy: user.userAccountId, requestType: 'EXPORT' },
      select: { id: true },
    });

    // As athlete: ACTIVE membership, an entry, a summary, visibility settings.
    const membershipId = await createTestMembership({ clubId, athleteId, clubTrainerId: trainerRow, status: 'ACTIVE' });
    await prisma.athleteMetricEntry.create({
      data: { athleteId, metricDefinitionId: definitionId, clubMembershipId: membershipId, reportedByClubTrainerId: trainerRow, value: 61.5, measuredAt: new Date() },
      select: { id: true },
    });
    await prisma.athleteMetricSummary.create({
      data: { athleteId, metricDefinitionId: definitionId, latestValue: 61.5, latestMeasuredAt: new Date(), entryCount: 1 },
      select: { athleteId: true },
    });
    await prisma.athleteVisibilitySettings.create({ data: { athleteId, metricsAudience: 'PUBLIC' }, select: { athleteId: true } });

    // As trainer: the deleted athlete coaches `friend` in their own club.
    const ownTrainerRow = await addClubTrainer(ownClubId, user.userAccountId);
    const friendMembership = await createTestMembership({
      clubId: ownClubId, athleteId: friend.athleteId, clubTrainerId: ownTrainerRow, status: 'ACTIVE',
    });
    const reportedForFriend = await prisma.athleteMetricEntry.create({
      data: { athleteId: friend.athleteId, metricDefinitionId: definitionId, clubMembershipId: friendMembership, reportedByClubTrainerId: ownTrainerRow, value: 12.1, measuredAt: new Date() },
      select: { id: true },
    });

    await prisma.deviceToken.create({
      data: { userAccountId: user.userAccountId, token: `ExponentPushToken[del${randomUUID().slice(0, 8)}]`, platform: 'IOS' },
      select: { id: true },
    });

    await uploadPhoto(athleteId, 'original.jpg');
    await uploadPhoto(athleteId, 'thumb-150.webp');

    const requestId = await createDeletionRequest(athleteId, user.userAccountId);
    return { user, athleteId, requestId, ownTrainerRow, reportedForFriendId: reportedForFriend.id, trainerRow };
  }

  async function cleanupFriendSide(ownTrainerRow: string) {
    await prisma.athleteMetricEntry.deleteMany({ where: { reportedByClubTrainerId: ownTrainerRow } });
    await prisma.clubMembership.deleteMany({ where: { invitedByClubTrainerId: ownTrainerRow } });
  }

  it('6.3/6.4: deletes every athlete-owned record, keeps retained rows, tombstones, and verifies', async () => {
    const a = await populatedAthlete('del-full');
    const log = captureLogger();
    try {
      const outcome = await runPiiDeletion(
        { prisma, externals: real, log },
        { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-full' },
      );
      expect(outcome).toBe('COMPLETED');

      const where = { athleteId: a.athleteId };
      expect({
        entries: await prisma.athleteMetricEntry.count({ where }),
        summaries: await prisma.athleteMetricSummary.count({ where }),
        memberships: await prisma.clubMembership.count({ where }),
        visibility: await prisma.athleteVisibilitySettings.count({ where }),
        connections: await prisma.athleteConnection.count({
          where: { OR: [{ requesterId: a.athleteId }, { addresseeId: a.athleteId }] },
        }),
        achievements: await prisma.athleteAchievement.count({ where }),
        publicProfile: await prisma.athletePublicProfile.count({ where }),
        privateProfile: await prisma.athletePrivateProfile.count({ where }),
        photos: await prisma.profilePhotoAsset.count({ where }),
        otherRequests: await prisma.dataLifecycleRequest.count({ where: { ...where, id: { not: a.requestId } } }),
        deviceTokens: await prisma.deviceToken.count({ where: { userAccountId: a.user.userAccountId } }),
      }).toEqual({
        entries: 0, summaries: 0, memberships: 0, visibility: 0, connections: 0, achievements: 0,
        publicProfile: 0, privateProfile: 0, photos: 0, otherRequests: 0, deviceTokens: 0,
      });
      expect(await real.listStorageObjects(`${a.athleteId}/`)).toEqual([]);

      // Retained for 5 years (D8a).
      expect(await prisma.piiConsentLog.count({ where })).toBe(1);
      expect(await prisma.auditEvent.count({ where })).toBe(1);

      // Tombstone.
      expect(
        await prisma.athlete.findUniqueOrThrow({
          where: { id: a.athleteId },
          select: { slug: true, displayName: true, profileStatus: true },
        }),
      ).toEqual({ slug: tombstoneSlug(a.athleteId), displayName: DELETED_DISPLAY_NAME, profileStatus: 'HIDDEN' });
      expect(
        await prisma.userAccount.findUniqueOrThrow({
          where: { id: a.user.userAccountId },
          select: { supabaseUserId: true, status: true },
        }),
      ).toEqual({ supabaseUserId: tombstoneSupabaseUserId(a.user.userAccountId), status: 'DEACTIVATED' });
      expect(await authUserExists(a.user.supabaseUserId)).toBe(false);

      // The request is the record of the deletion.
      expect(
        (await prisma.dataLifecycleRequest.findUniqueOrThrow({ where: { id: a.requestId }, select: { status: true } })).status,
      ).toBe('COMPLETED');

      // Trainers' own records unaffected (spec): the club trainer row of the
      // other club, and entries the deleted athlete reported for `friend`.
      expect(await prisma.clubTrainer.count({ where: { id: a.trainerRow } })).toBe(1);
      expect(await prisma.athleteMetricEntry.count({ where: { id: a.reportedForFriendId } })).toBe(1);
      expect(await prisma.clubTrainer.count({ where: { id: a.ownTrainerRow } })).toBe(1);

      // The friend's cached connection count followed the deleted connection.
      expect(
        (await prisma.athletePublicProfile.findUniqueOrThrow({
          where: { athleteId: friend.athleteId },
          select: { connectionCountCache: true },
        })).connectionCountCache,
      ).toBe(0);

      // Every log line carries the requestId; none carries row data.
      expect(log.lines.length).toBeGreaterThan(0);
      for (const line of log.lines) expect(line.obj['requestId']).toBe('req-full');
    } finally {
      await cleanupFriendSide(a.ownTrainerRow);
      await purgeAthlete(a.athleteId, a.user.userAccountId);
    }
  });

  it('6.4: marks FAILED and logs an error when verification finds residue', async () => {
    const a = await populatedAthlete('del-residue');
    const log = captureLogger();
    // Storage removal silently does nothing → verification must catch it.
    const skippingStorage: DeletionExternals = { ...real, removeStorageObjects: () => Promise.resolve() };
    try {
      const outcome = await runPiiDeletion(
        { prisma, externals: skippingStorage, log },
        { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-residue' },
      );
      expect(outcome).toBe('FAILED');
      expect(
        (await prisma.dataLifecycleRequest.findUniqueOrThrow({ where: { id: a.requestId }, select: { status: true } })).status,
      ).toBe('FAILED');
      const incomplete = log.lines.find((l) => l.obj['event'] === 'pii_deletion_incomplete');
      expect(incomplete?.level).toBe('error');
      expect(incomplete?.obj['requestId']).toBe('req-residue');
      expect(incomplete?.obj['residue']).toEqual(['storage profile-photos']);
    } finally {
      await cleanupFriendSide(a.ownTrainerRow);
      await purgeAthlete(a.athleteId, a.user.userAccountId);
    }
  });

  it('6.5: a legal hold blocks deletion entirely', async () => {
    const a = await populatedAthlete('del-hold');
    await prisma.athlete.update({ where: { id: a.athleteId }, data: { isUnderLegalHold: true }, select: { id: true } });
    const log = captureLogger();
    try {
      const outcome = await runPiiDeletion(
        { prisma, externals: real, log },
        { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-hold' },
      );
      expect(outcome).toBe('BLOCKED_LEGAL_HOLD');
      expect(
        (await prisma.dataLifecycleRequest.findUniqueOrThrow({ where: { id: a.requestId }, select: { status: true } })).status,
      ).toBe('BLOCKED_LEGAL_HOLD');
      const warning = log.lines.find((l) => l.level === 'warn');
      expect(warning?.msg).toBe('Deletion blocked by legal hold');
      expect(warning?.obj['requestId']).toBe('req-hold');

      // Nothing deleted, nothing anonymized.
      expect(await prisma.athleteAchievement.count({ where: { athleteId: a.athleteId } })).toBe(1);
      expect(await prisma.athleteMetricEntry.count({ where: { athleteId: a.athleteId } })).toBe(1);
      expect((await real.listStorageObjects(`${a.athleteId}/`)).length).toBe(2);
      expect(await authUserExists(a.user.supabaseUserId)).toBe(true);
      expect(
        (await prisma.athlete.findUniqueOrThrow({ where: { id: a.athleteId }, select: { slug: true } })).slug,
      ).not.toBe(tombstoneSlug(a.athleteId));
    } finally {
      await prisma.athlete.update({ where: { id: a.athleteId }, data: { isUnderLegalHold: false }, select: { id: true } });
      await cleanupFriendSide(a.ownTrainerRow);
      await purgeAthlete(a.athleteId, a.user.userAccountId, a.user.supabaseUserId);
    }
  });

  it('6.5: a failed attempt leaves the request FAILED and a retry completes it', async () => {
    const a = await populatedAthlete('del-retry');
    const log = captureLogger();
    const authDown: DeletionExternals = {
      ...real,
      deleteAuthUser: () => Promise.reject(new Error('auth API unavailable')),
    };
    try {
      await expect(
        runPiiDeletion(
          { prisma, externals: authDown, log },
          { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-retry-1' },
        ),
      ).rejects.toThrow('auth API unavailable');

      expect(
        (await prisma.dataLifecycleRequest.findUniqueOrThrow({ where: { id: a.requestId }, select: { status: true } })).status,
      ).toBe('FAILED');
      // Not tombstoned yet, so the retry still knows the auth user.
      expect(
        (await prisma.userAccount.findUniqueOrThrow({ where: { id: a.user.userAccountId }, select: { supabaseUserId: true } }))
          .supabaseUserId,
      ).toBe(a.user.supabaseUserId);

      const outcome = await runPiiDeletion(
        { prisma, externals: real, log },
        { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-retry-2' },
      );
      expect(outcome).toBe('COMPLETED');
      expect(await authUserExists(a.user.supabaseUserId)).toBe(false);

      // A duplicate job after completion is a no-op.
      expect(
        await runPiiDeletion(
          { prisma, externals: real, log },
          { dataLifecycleRequestId: a.requestId, athleteId: a.athleteId, requestId: 'req-retry-3' },
        ),
      ).toBe('SKIPPED');
    } finally {
      await cleanupFriendSide(a.ownTrainerRow);
      await purgeAthlete(a.athleteId, a.user.userAccountId, a.user.supabaseUserId);
    }
  });
});
