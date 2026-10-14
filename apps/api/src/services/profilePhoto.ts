/**
 * image-optimization worker logic (ADR-010, ADR-015). The BullMQ wiring lives
 * in jobs/optimizeImage.ts; this file is testable without Redis.
 *
 * Flow: claim the ORIGINAL row (RUNNING) → download → sharp variants (EXIF
 * orientation applied, all metadata dropped) → upload to the public bucket
 * under a per-upload version folder → one transaction marks every row READY
 * and points the avatar at CARD_400 → best-effort removal of older uploads.
 *
 * A job whose originalPath no longer matches the ORIGINAL row was replaced by
 * a newer upload and is skipped. Any failure leaves the row FAILED and
 * rethrows so BullMQ retries; each attempt re-claims the row.
 */
import type { PhotoVariant } from '@packages/validators';
import type { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

import type { PhotoStorage } from '../lib/supabaseAdmin.js';

import { ORIGINALS_BUCKET, VARIANTS_BUCKET } from './storage.js';

export const VARIANT_SPECS = [
  { variant: 'THUMB_150', size: 150, quality: 80, file: 'thumb-150.webp' },
  { variant: 'CARD_400', size: 400, quality: 85, file: 'card-400.webp' },
  { variant: 'FULL_1200', size: 1200, quality: 90, file: 'full-1200.webp' },
] as const satisfies ReadonlyArray<{
  variant: Exclude<PhotoVariant, 'ORIGINAL'>;
  size: number;
  quality: number;
  file: string;
}>;

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
/** Rejects decompression bombs well before sharp's 268 MP default. */
const MAX_INPUT_PIXELS = 50_000_000;

export interface RenderedPhoto {
  /** Upright dimensions of the original (EXIF orientation applied). */
  width: number;
  height: number;
  variants: Array<{ spec: (typeof VARIANT_SPECS)[number]; data: Buffer }>;
}

/** Pure image work: validate and produce the three EXIF-free WebP variants. */
export async function renderVariants(original: Buffer): Promise<RenderedPhoto> {
  const input = () => sharp(original, { limitInputPixels: MAX_INPUT_PIXELS });
  const meta = await input().metadata();
  if (meta.format === undefined || !SUPPORTED_FORMATS.has(meta.format)) {
    throw new Error('unsupported image format');
  }
  const { width, height } = meta.autoOrient;

  const variants = await Promise.all(
    VARIANT_SPECS.map(async (spec) => ({
      spec,
      // sharp writes no metadata unless asked (no withMetadata/keepMetadata),
      // so EXIF, GPS, ICC and XMP are all dropped. rotate() bakes in the
      // EXIF orientation first so the stripped image stays upright.
      data: await input()
        .rotate()
        .resize(spec.size, spec.size, { fit: 'cover' })
        .webp({ quality: spec.quality })
        .toBuffer(),
    })),
  );
  return { width, height, variants };
}

export interface ImageOptimizationInput {
  athleteId: string;
  /** Bucket-relative path in the originals bucket: `{athleteId}/{issuedAtMs}.{ext}`. */
  originalPath: string;
  requestId: string;
}

interface WorkerLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

/** `{athleteId}/{issuedAtMs}` — the version folder for this upload's variants. */
function versionFolder(originalPath: string): string {
  const dot = originalPath.lastIndexOf('.');
  return dot === -1 ? originalPath : originalPath.slice(0, dot);
}

export async function runImageOptimization(
  deps: { prisma: PrismaClient; storage: PhotoStorage; log: WorkerLogger },
  input: ImageOptimizationInput,
): Promise<'READY' | 'SUPERSEDED'> {
  const { prisma, storage, log } = deps;
  const logCtx = { requestId: input.requestId, athleteId: input.athleteId };
  const currentOriginal = {
    athleteId: input.athleteId,
    variant: 'ORIGINAL' as const,
    objectPath: input.originalPath,
  };

  const claimed = await prisma.profilePhotoAsset.updateMany({
    where: currentOriginal,
    data: { processingStatus: 'RUNNING' },
  });
  if (claimed.count === 0) {
    log.info(
      { event: 'image_optimization_superseded', ...logCtx },
      'upload was replaced; skipping',
    );
    return 'SUPERSEDED';
  }

  try {
    const rendered = await renderVariants(
      await storage.download(ORIGINALS_BUCKET, input.originalPath),
    );
    const folder = versionFolder(input.originalPath);
    for (const { spec, data } of rendered.variants) {
      await storage.upload(VARIANTS_BUCKET, `${folder}/${spec.file}`, data, 'image/webp');
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // A newer upload may have landed while this one was rendering.
      const original = await tx.profilePhotoAsset.updateMany({
        where: currentOriginal,
        data: { processingStatus: 'READY', width: rendered.width, height: rendered.height },
      });
      if (original.count === 0) return 'SUPERSEDED' as const;

      let cardId: string | null = null;
      for (const spec of VARIANT_SPECS) {
        const row = {
          objectPath: `${folder}/${spec.file}`,
          width: spec.size,
          height: spec.size,
          processingStatus: 'READY' as const,
        };
        // Upsert keeps the row id, so an existing avatarAssetId stays valid.
        const asset = await tx.profilePhotoAsset.upsert({
          where: { athleteId_variant: { athleteId: input.athleteId, variant: spec.variant } },
          create: { athleteId: input.athleteId, variant: spec.variant, ...row },
          update: row,
          select: { id: true },
        });
        if (spec.variant === 'CARD_400') cardId = asset.id;
      }
      await tx.athletePublicProfile.updateMany({
        where: { athleteId: input.athleteId },
        data: { avatarAssetId: cardId },
      });
      return 'READY' as const;
    });

    if (outcome === 'SUPERSEDED') {
      log.info(
        { event: 'image_optimization_superseded', ...logCtx },
        'upload was replaced; skipping',
      );
      return outcome;
    }
    await removeOlderVersions(deps, input);
    log.info({ event: 'image_optimization_ready', ...logCtx }, 'profile photo variants ready');
    return outcome;
  } catch (error) {
    await prisma.profilePhotoAsset.updateMany({
      where: currentOriginal,
      data: { processingStatus: 'FAILED' },
    });
    throw error;
  }
}

/** Upload timestamp encoded in `{athleteId}/{issuedAtMs}…`, or null if absent. */
function issuedAtOf(path: string, athleteId: string): number | null {
  const match = /^(\d{13})(?:[./]|$)/.exec(path.slice(athleteId.length + 1));
  return match?.[1] === undefined ? null : Number(match[1]);
}

/**
 * Best effort: removes originals and variant folders from uploads issued
 * before this one. Newer uploads (possibly not yet confirmed) are left alone.
 * Storage leftovers never fail a finished job; deletePII sweeps the rest.
 */
async function removeOlderVersions(
  deps: { storage: PhotoStorage; log: WorkerLogger },
  input: ImageOptimizationInput,
): Promise<void> {
  const current = issuedAtOf(input.originalPath, input.athleteId);
  if (current === null) return;
  const isOlder = (path: string) => {
    const issuedAt = issuedAtOf(path, input.athleteId);
    return issuedAt !== null && issuedAt < current;
  };
  try {
    const prefix = `${input.athleteId}/`;
    for (const bucket of [ORIGINALS_BUCKET, VARIANTS_BUCKET]) {
      const stale = (await deps.storage.list(bucket, prefix)).filter(isOlder);
      if (stale.length > 0) await deps.storage.remove(bucket, stale);
    }
  } catch (error) {
    deps.log.warn(
      {
        event: 'image_optimization_cleanup_failed',
        requestId: input.requestId,
        athleteId: input.athleteId,
        error:
          error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      'could not remove older photo versions',
    );
  }
}
