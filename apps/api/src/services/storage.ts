/**
 * Profile-photo upload flow (ADR-015, AGENTS.md Storage and image rules).
 *
 *   getUploadUrl  → one-shot signed upload URL for
 *                   `{athleteId}/{issuedAtMs}-{nonce}.{ext}` in the private
 *                   originals bucket
 *   (client uploads directly to Supabase Storage)
 *   confirmUpload → 15-minute window + object exists → ORIGINAL row QUEUED
 *                   (persisted first) → image-optimization job; idempotent
 *                   for an upload that is already queued or processed
 *   getViewUrl    → owner-only signed URL (15 min) for one of their variants
 *
 * Every path is derived from the caller's own athlete; nothing here accepts a
 * client-supplied path.
 */
import { randomBytes } from 'node:crypto';

import { QUEUE_NAMES } from '@packages/queue';
import type {
  ConfirmStorageUploadInput,
  ConfirmStorageUploadOutput,
  GetStorageUploadUrlInput,
  GetStorageViewUrlInput,
  PhotoContentType,
  PhotoVariant,
  SignedStorageUrlOutput,
  StorageBucket,
  StorageUploadUrlOutput,
} from '@packages/validators';
import type { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type { FastifyBaseLogger } from 'fastify';

import type { JobEnqueuer } from '../lib/jobs.js';
import type { PhotoStorage } from '../lib/supabaseAdmin.js';

/** Signed view URLs and the upload-confirmation window, in seconds. */
export const SIGNED_URL_TTL_SECONDS = 15 * 60;

export const ORIGINALS_BUCKET: StorageBucket = 'profile-photo-originals';
export const VARIANTS_BUCKET: StorageBucket = 'profile-photos';

const EXTENSION: Record<PhotoContentType, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Issue time encoded in an upload id (`{issuedAtMs}-{nonce}.{ext}`). */
export const issuedAtOfUploadId = (uploadId: string): number =>
  Number(uploadId.slice(0, uploadId.indexOf('-')));

/** Bucket-relative path of an upload in the originals bucket. */
export const originalPath = (athleteId: string, uploadId: string): string =>
  `${athleteId}/${uploadId}`;

/** Bucket that holds a variant's objects. */
export const bucketOf = (variant: PhotoVariant): StorageBucket =>
  variant === 'ORIGINAL' ? ORIGINALS_BUCKET : VARIANTS_BUCKET;

/** Placeholder until the worker reads the real size (ADR-015). */
const PENDING_DIMENSION = 1;

interface Caller {
  athleteId: string;
  requestId: string;
}

/**
 * Storage failures carry provider details; log them and return a generic
 * message (AGENTS.md tRPC rules: no internal details in client errors).
 */
async function storageCall<T>(
  log: FastifyBaseLogger,
  requestId: string,
  operation: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    log.error(
      {
        event: 'storage_operation_failed',
        requestId,
        operation,
        error:
          error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      'storage operation failed',
    );
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Photo storage is unavailable. Please try again.',
    });
  }
}

export async function getUploadUrl(
  deps: { storage: PhotoStorage; log: FastifyBaseLogger },
  caller: Caller,
  input: GetStorageUploadUrlInput,
  now: Date = new Date(),
): Promise<StorageUploadUrlOutput> {
  // The nonce keeps uploads issued in the same millisecond on distinct paths;
  // the signed URL is one-shot (no upsert), so a path is never overwritten.
  const nonce = randomBytes(8).toString('hex');
  const uploadId = `${now.getTime()}-${nonce}.${EXTENSION[input.contentType]}`;
  const path = originalPath(caller.athleteId, uploadId);
  const { signedUrl, token } = await storageCall(
    deps.log,
    caller.requestId,
    'signed_upload_url',
    () => deps.storage.createSignedUploadUrl(ORIGINALS_BUCKET, path),
  );
  return { signedUrl, token, path, uploadId, expiresIn: SIGNED_URL_TTL_SECONDS };
}

export async function confirmUpload(
  deps: { prisma: PrismaClient; storage: PhotoStorage; jobs: JobEnqueuer; log: FastifyBaseLogger },
  caller: Caller,
  input: ConfirmStorageUploadInput,
  now: Date = new Date(),
): Promise<ConfirmStorageUploadOutput> {
  const age = now.getTime() - issuedAtOfUploadId(input.uploadId);
  if (age < 0 || age > SIGNED_URL_TTL_SECONDS * 1000) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This upload has expired. Request a new upload link and try again.',
    });
  }

  const path = originalPath(caller.athleteId, input.uploadId);
  const uploaded = await storageCall(deps.log, caller.requestId, 'exists', () =>
    deps.storage.exists(ORIGINALS_BUCKET, path),
  );
  if (!uploaded) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Uploaded photo not found' });
  }

  // Repeat confirmations of the same upload must not reset a READY photo or
  // queue a second job. Only a FAILED upload is re-queued (client retry).
  const current = await deps.prisma.profilePhotoAsset.findUnique({
    where: { athleteId_variant: { athleteId: caller.athleteId, variant: 'ORIGINAL' } },
    select: { objectPath: true, processingStatus: true },
  });
  if (current?.objectPath === path && current.processingStatus !== 'FAILED') {
    return { processingStatus: current.processingStatus };
  }

  // Persist BEFORE enqueue (AGENTS.md Background jobs).
  const original = await deps.prisma.profilePhotoAsset.upsert({
    where: { athleteId_variant: { athleteId: caller.athleteId, variant: 'ORIGINAL' } },
    create: {
      athleteId: caller.athleteId,
      variant: 'ORIGINAL',
      objectPath: path,
      width: PENDING_DIMENSION,
      height: PENDING_DIMENSION,
      processingStatus: 'QUEUED',
    },
    update: {
      objectPath: path,
      width: PENDING_DIMENSION,
      height: PENDING_DIMENSION,
      processingStatus: 'QUEUED',
    },
    select: { id: true },
  });

  try {
    await deps.jobs.enqueue(QUEUE_NAMES.IMAGE_OPTIMIZATION, {
      athleteId: caller.athleteId,
      originalPath: path,
      requestId: caller.requestId,
    });
  } catch (error) {
    await deps.prisma.profilePhotoAsset.update({
      where: { id: original.id },
      data: { processingStatus: 'FAILED' },
      select: { id: true },
    });
    deps.log.error(
      {
        event: 'image_optimization_enqueue_failed',
        requestId: caller.requestId,
        athleteId: caller.athleteId,
        error:
          error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      'could not enqueue image optimization',
    );
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Your photo was uploaded but could not be processed. Please try again.',
    });
  }

  deps.log.info(
    { event: 'profile_photo_confirmed', requestId: caller.requestId, athleteId: caller.athleteId },
    'profile photo queued for optimization',
  );
  return { processingStatus: 'QUEUED' };
}

export async function getViewUrl(
  deps: { prisma: PrismaClient; storage: PhotoStorage; log: FastifyBaseLogger },
  caller: Caller,
  input: GetStorageViewUrlInput,
): Promise<SignedStorageUrlOutput> {
  const asset = await deps.prisma.profilePhotoAsset.findUnique({
    where: { athleteId_variant: { athleteId: caller.athleteId, variant: input.variant } },
    select: { objectPath: true, processingStatus: true },
  });
  // The ORIGINAL exists as soon as it is confirmed; variants only once READY.
  if (asset === null || (input.variant !== 'ORIGINAL' && asset.processingStatus !== 'READY')) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
  }
  const signedUrl = await storageCall(deps.log, caller.requestId, 'signed_view_url', () =>
    deps.storage.createSignedViewUrl(
      bucketOf(input.variant),
      asset.objectPath,
      SIGNED_URL_TTL_SECONDS,
    ),
  );
  return { signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}
