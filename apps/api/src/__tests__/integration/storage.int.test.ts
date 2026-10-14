/**
 * storage router (ADR-015) — real API server, real database, real Supabase
 * Storage. Workers are not run; a recording job port proves the ORIGINAL row
 * is persisted before image-optimization is enqueued.
 *
 * Covers, per procedure: success, invalid input (Zod), 401, 404; plus the
 * 15-minute confirmation window, forged and cross-athlete upload ids, and
 * the enqueue-failure path.
 */
import './helpers/load-env.js';

import type { QueueJobData, QueueName } from '@packages/queue';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { JobEnqueuer } from '../../lib/jobs.js';

import {
  apiClient,
  authReady,
  cleanupAuthedUser,
  createAuthedUser,
  createTestSport,
  deleteTestSport,
  expectTRPCCode,
  prisma,
  purgeProfilePhotoObjects,
  startServer,
  type AuthedUser,
  type TestServer,
} from './helpers/setup.js';

function athleteIdOf(user: AuthedUser): string {
  if (user.athleteId === null) throw new Error('fixture has no athlete');
  return user.athleteId;
}

const jpeg = () =>
  sharp({ create: { width: 640, height: 480, channels: 3, background: '#0b1220' } })
    .jpeg()
    .toBuffer();

/** Upload the way a client does: anon key + the signed token, no session. */
async function uploadWithToken(path: string, token: string, body: Buffer): Promise<void> {
  const anon = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_ANON_KEY'] ?? '',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const { error } = await anon.storage
    .from('profile-photo-originals')
    .uploadToSignedUrl(path, token, body, { contentType: 'image/jpeg' });
  if (error !== null) throw new Error(`uploadToSignedUrl: ${error.message}`);
}

const originalRow = (athleteId: string) =>
  prisma.profilePhotoAsset.findUnique({
    where: { athleteId_variant: { athleteId, variant: 'ORIGINAL' } },
    select: { objectPath: true, processingStatus: true },
  });

describe.skipIf(!authReady)('storage router', () => {
  interface Enqueued {
    queue: QueueName;
    data: QueueJobData[QueueName];
    rowStatus: string | null;
  }
  const enqueued: Enqueued[] = [];
  const recorder: JobEnqueuer = {
    async enqueue(queue, data) {
      const athleteId = 'athleteId' in data ? data.athleteId : '';
      const row = await originalRow(athleteId);
      enqueued.push({ queue, data, rowStatus: row?.processingStatus ?? null });
    },
  };
  const failing: JobEnqueuer = { enqueue: () => Promise.reject(new Error('redis down')) };

  let server: TestServer;
  let failingServer: TestServer;
  let sportId: string;
  let owner: AuthedUser;
  let other: AuthedUser;
  let noAthlete: AuthedUser;

  beforeAll(async () => {
    const limits = { authenticated: 100_000, sensitive: 100_000, public: 100_000 };
    server = await startServer(limits, { jobs: recorder });
    failingServer = await startServer(limits, { jobs: failing });
    sportId = await createTestSport();
    owner = await createAuthedUser({ sportId, label: 'photo-owner' });
    other = await createAuthedUser({ sportId, label: 'photo-other' });
    noAthlete = await createAuthedUser({ withAthlete: false, label: 'photo-none' });
  });

  afterAll(async () => {
    for (const u of [owner, other]) await purgeProfilePhotoObjects(athleteIdOf(u));
    for (const u of [owner, other, noAthlete]) await cleanupAuthedUser(u);
    await deleteTestSport(sportId);
    await server.close();
    await failingServer.close();
  });

  const as = (user?: AuthedUser) => apiClient(server.url, user?.accessToken);

  describe('authentication and input', () => {
    it('rejects every procedure without a session (401)', async () => {
      await expectTRPCCode(
        as().storage.getUploadUrl.mutate({ contentType: 'image/jpeg' }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(
        as().storage.confirmUpload.mutate({ uploadId: `${Date.now()}.jpg` }),
        'UNAUTHORIZED',
      );
      await expectTRPCCode(as().storage.getViewUrl.query({ variant: 'ORIGINAL' }), 'UNAUTHORIZED');
    });

    it('rejects invalid input (Zod)', async () => {
      const client = as(owner);
      // Casts: these values are deliberately outside the input types.
      await expectTRPCCode(
        client.storage.getUploadUrl.mutate({ contentType: 'image/gif' as 'image/jpeg' }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        client.storage.confirmUpload.mutate({
          uploadId: `../${athleteIdOf(other)}/1760400000000.jpg`,
        }),
        'BAD_REQUEST',
      );
      await expectTRPCCode(
        client.storage.getViewUrl.query({ variant: 'BOGUS' as 'ORIGINAL' }),
        'BAD_REQUEST',
      );
    });

    it('returns 404 for an account without an athlete profile', async () => {
      await expectTRPCCode(
        as(noAthlete).storage.getUploadUrl.mutate({ contentType: 'image/jpeg' }),
        'NOT_FOUND',
      );
      await expectTRPCCode(
        as(noAthlete).storage.getViewUrl.query({ variant: 'ORIGINAL' }),
        'NOT_FOUND',
      );
    });
  });

  describe('upload flow', () => {
    let uploadId: string;

    it('getViewUrl is 404 before any upload', async () => {
      await expectTRPCCode(
        as(owner).storage.getViewUrl.query({ variant: 'ORIGINAL' }),
        'NOT_FOUND',
      );
    });

    it('issues an upload URL for a server-built path in the caller’s folder', async () => {
      const result = await as(owner).storage.getUploadUrl.mutate({ contentType: 'image/jpeg' });
      expect(result.uploadId).toMatch(/^\d{13}\.jpg$/);
      expect(result.path).toBe(`${athleteIdOf(owner)}/${result.uploadId}`);
      expect(result.expiresIn).toBe(900);
      await uploadWithToken(result.path, result.token, await jpeg());
      uploadId = result.uploadId;
    });

    it('confirmUpload is 404 for another athlete, even with a real upload id', async () => {
      await expectTRPCCode(as(other).storage.confirmUpload.mutate({ uploadId }), 'NOT_FOUND');
      expect(await originalRow(athleteIdOf(other))).toBeNull();
    });

    it('confirmUpload is 404 for an upload id that was never uploaded', async () => {
      await expectTRPCCode(
        as(owner).storage.confirmUpload.mutate({ uploadId: `${Date.now()}.png` }),
        'NOT_FOUND',
      );
    });

    it('confirmUpload rejects an upload older than 15 minutes', async () => {
      const stale = `${Date.now() - 16 * 60_000}.jpg`;
      await expectTRPCCode(
        as(owner).storage.confirmUpload.mutate({ uploadId: stale }),
        'BAD_REQUEST',
      );
    });

    it('confirms: ORIGINAL row QUEUED before the job is enqueued with ids only', async () => {
      const before = enqueued.length;
      const result = await as(owner).storage.confirmUpload.mutate({ uploadId });
      expect(result).toEqual({ processingStatus: 'QUEUED' });

      expect(await originalRow(athleteIdOf(owner))).toEqual({
        objectPath: `${athleteIdOf(owner)}/${uploadId}`,
        processingStatus: 'QUEUED',
      });
      expect(enqueued).toHaveLength(before + 1);
      const job = enqueued.at(-1);
      expect(job?.queue).toBe('image-optimization');
      expect(job?.rowStatus).toBe('QUEUED');
      expect(job?.data).toMatchObject({
        athleteId: athleteIdOf(owner),
        originalPath: `${athleteIdOf(owner)}/${uploadId}`,
      });
      expect(job?.data.requestId.length).toBeGreaterThan(0);
      expect(Object.keys(job?.data ?? {}).sort()).toEqual([
        'athleteId',
        'originalPath',
        'requestId',
      ]);
    });

    it('getViewUrl returns a working 15-minute URL for the owner’s ORIGINAL', async () => {
      const result = await as(owner).storage.getViewUrl.query({ variant: 'ORIGINAL' });
      expect(result.expiresIn).toBe(900);
      const response = await fetch(result.signedUrl);
      expect(response.status).toBe(200);
      expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format).toBe(
        'jpeg',
      );
    });

    it('getViewUrl is 404 for variants that are not READY yet', async () => {
      await expectTRPCCode(
        as(owner).storage.getViewUrl.query({ variant: 'CARD_400' }),
        'NOT_FOUND',
      );
    });

    it('the original is not reachable through the public endpoint', async () => {
      const row = await originalRow(athleteIdOf(owner));
      const response = await fetch(
        `${process.env['SUPABASE_URL'] ?? ''}/storage/v1/object/public/profile-photo-originals/${row?.objectPath ?? ''}`,
      );
      expect(response.ok).toBe(false);
    });
  });

  describe('enqueue failure', () => {
    it('marks the ORIGINAL row FAILED and returns a generic 500', async () => {
      const client = apiClient(failingServer.url, other.accessToken);
      const issued = await client.storage.getUploadUrl.mutate({ contentType: 'image/jpeg' });
      await uploadWithToken(issued.path, issued.token, await jpeg());

      await expectTRPCCode(
        client.storage.confirmUpload.mutate({ uploadId: issued.uploadId }),
        'INTERNAL_SERVER_ERROR',
      );
      expect((await originalRow(athleteIdOf(other)))?.processingStatus).toBe('FAILED');
    });
  });
});
