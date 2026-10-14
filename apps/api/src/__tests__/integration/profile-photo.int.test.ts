/**
 * image-optimization worker logic (services/profilePhoto.ts, ADR-015) against
 * the real database and real Supabase Storage, without Redis.
 *
 * Proves: three public EXIF-free WebP variants and READY rows; the original's
 * upright size; the avatar points at CARD_400; a re-upload keeps row ids and
 * removes the older version but never a newer, unconfirmed upload; a
 * superseded job is skipped; a corrupt file leaves the row FAILED.
 */
import './helpers/load-env.js';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSupabasePhotoStorage } from '../../lib/supabaseAdmin.js';
import { runImageOptimization } from '../../services/profilePhoto.js';
import { ORIGINALS_BUCKET, VARIANTS_BUCKET } from '../../services/storage.js';

import {
  cleanupFixtureAthlete,
  createFixtureAthlete,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
  purgeProfilePhotoObjects,
  type FixtureAthlete,
} from './helpers/setup.js';

const storageReady = dbReady && process.env['SUPABASE_SERVICE_ROLE_KEY'] !== undefined;

const quietLog = { info: () => undefined, warn: () => undefined };

/** 900×600 JPEG with GPS EXIF, tagged to display rotated (→ 600×900). */
const photo = () =>
  sharp({ create: { width: 900, height: 600, channels: 3, background: '#1a6bff' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '6/1 15/1 0/1' } })
    .toBuffer();

describe.skipIf(!storageReady)('image optimization (worker logic)', () => {
  const storage = createSupabasePhotoStorage();
  let sportId: string;
  let fx: FixtureAthlete;
  let issuedAt = Date.now() - 60_000;
  const nextUploadPath = (ext = 'jpg') => `${fx.athleteId}/${(issuedAt += 1000)}.${ext}`;

  /** What confirmUpload does: object stored, ORIGINAL row QUEUED. */
  async function confirmed(path: string, body: Buffer): Promise<void> {
    await storage.upload(ORIGINALS_BUCKET, path, body, 'image/jpeg');
    const row = { objectPath: path, width: 1, height: 1, processingStatus: 'QUEUED' as const };
    await prisma.profilePhotoAsset.upsert({
      where: { athleteId_variant: { athleteId: fx.athleteId, variant: 'ORIGINAL' } },
      create: { athleteId: fx.athleteId, variant: 'ORIGINAL', ...row },
      update: row,
      select: { id: true },
    });
  }

  const run = (originalPath: string) =>
    runImageOptimization(
      { prisma, storage, log: quietLog },
      { athleteId: fx.athleteId, originalPath, requestId: 'req-photo' },
    );

  const rows = () =>
    prisma.profilePhotoAsset.findMany({
      where: { athleteId: fx.athleteId },
      orderBy: { variant: 'asc' },
      select: {
        id: true,
        variant: true,
        objectPath: true,
        width: true,
        height: true,
        processingStatus: true,
      },
    });

  beforeAll(async () => {
    sportId = await createTestSport();
    fx = await createFixtureAthlete(sportId);
  });

  afterAll(async () => {
    await purgeProfilePhotoObjects(fx.athleteId);
    await cleanupFixtureAthlete(fx);
    await deleteTestSport(sportId);
  });

  let firstPath: string;
  let firstIds: Map<string, string>;

  it('renders three public variants, marks every row READY, and sets the avatar', async () => {
    firstPath = nextUploadPath();
    await confirmed(firstPath, await photo());
    expect(await run(firstPath)).toBe('READY');

    const all = await rows();
    firstIds = new Map(all.map((r) => [r.variant, r.id]));
    const folder = firstPath.replace(/\.jpg$/, '');
    expect(
      all.map(({ variant, objectPath, width, height, processingStatus }) => ({
        variant,
        objectPath,
        width,
        height,
        processingStatus,
      })),
    ).toEqual([
      {
        variant: 'ORIGINAL',
        objectPath: firstPath,
        width: 600,
        height: 900,
        processingStatus: 'READY',
      },
      {
        variant: 'THUMB_150',
        objectPath: `${folder}/thumb-150.webp`,
        width: 150,
        height: 150,
        processingStatus: 'READY',
      },
      {
        variant: 'CARD_400',
        objectPath: `${folder}/card-400.webp`,
        width: 400,
        height: 400,
        processingStatus: 'READY',
      },
      {
        variant: 'FULL_1200',
        objectPath: `${folder}/full-1200.webp`,
        width: 1200,
        height: 1200,
        processingStatus: 'READY',
      },
    ]);

    const profile = await prisma.athletePublicProfile.findUniqueOrThrow({
      where: { athleteId: fx.athleteId },
      select: { avatarAssetId: true },
    });
    expect(profile.avatarAssetId).toBe(firstIds.get('CARD_400'));
  });

  it('serves the variants anonymously as EXIF-free WebP', async () => {
    const card = (await rows()).find((r) => r.variant === 'CARD_400');
    const url = `${process.env['SUPABASE_URL'] ?? ''}/storage/v1/object/public/${VARIANTS_BUCKET}/${card?.objectPath ?? ''}`;
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    const meta = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 400, 400]);
    expect(meta.exif).toBeUndefined();
  });

  it('a re-upload keeps row ids, replaces paths, and removes only older versions', async () => {
    const secondPath = nextUploadPath();
    const newerUnconfirmed = nextUploadPath();
    await confirmed(secondPath, await photo());
    // Uploaded after secondPath but never confirmed: cleanup must leave it.
    await storage.upload(ORIGINALS_BUCKET, newerUnconfirmed, await photo(), 'image/jpeg');

    expect(await run(secondPath)).toBe('READY');
    const all = await rows();
    for (const r of all) expect(r.id).toBe(firstIds.get(r.variant));
    expect(all.find((r) => r.variant === 'ORIGINAL')?.objectPath).toBe(secondPath);

    expect((await storage.list(ORIGINALS_BUCKET, `${fx.athleteId}/`)).sort()).toEqual(
      [secondPath, newerUnconfirmed].sort(),
    );
    const variantFolder = secondPath.replace(/\.jpg$/, '');
    const variants = await storage.list(VARIANTS_BUCKET, `${fx.athleteId}/`);
    expect(variants).toHaveLength(3);
    for (const p of variants) expect(p.startsWith(`${variantFolder}/`)).toBe(true);
  });

  it('skips a job for an upload that has since been replaced', async () => {
    const before = await rows();
    expect(await run(firstPath)).toBe('SUPERSEDED');
    expect(await rows()).toEqual(before);
  });

  it('leaves the ORIGINAL row FAILED and rethrows on a corrupt file', async () => {
    const corrupt = nextUploadPath();
    await confirmed(corrupt, Buffer.from('definitely not a jpeg'));
    await expect(run(corrupt)).rejects.toThrow();
    const original = (await rows()).find((r) => r.variant === 'ORIGINAL');
    expect(original).toMatchObject({ objectPath: corrupt, processingStatus: 'FAILED' });
  });
});
