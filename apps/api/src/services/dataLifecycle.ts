/**
 * Habeas Data deletion (athlete-data-lifecycle spec, design D8 / D8a).
 *
 * requestDeletion (tRPC): persist a DELETION DataLifecycleRequest, THEN
 * enqueue pii-deletion. Re-requesting while a request is unfinished reuses
 * it and re-enqueues, so a lost or failed job is always recoverable.
 *
 * runPiiDeletion (worker):
 *   legal hold → BLOCKED_LEGAL_HOLD, nothing deleted
 *   claim REQUESTED|FAILED → IN_PROGRESS (a duplicate job becomes a no-op)
 *   delete every athlete-FK table except the retained ones
 *   remove Storage under {athleteId}/ and the Supabase auth user
 *   tombstone athlete + user_account (FK anchors for 5-year retention)
 *   verify → COMPLETED, or FAILED + error log
 * Any thrown error marks the request FAILED and rethrows so BullMQ retries;
 * every step is idempotent, so a retry continues where the last attempt
 * stopped. The auth user is deleted BEFORE the account is tombstoned, so a
 * retry still knows its Supabase id.
 *
 * Logs carry requestId and table names only — never L1/L2 values.
 */
import { QUEUE_NAMES } from '@packages/queue';
import type { DataLifecycleRequestOwnerOutput } from '@packages/validators';
import type { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { JobEnqueuer } from '../lib/jobs.js';
import type { DeletionExternals } from '../lib/supabaseAdmin.js';

export interface DeletionLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

const ownerOutputSelect = {
  id: true,
  requestType: true,
  status: true,
  createdAt: true,
  expiresAt: true,
  completedAt: true,
} as const satisfies Prisma.DataLifecycleRequestSelect;

/** Statuses from which a deletion can still (re)start. */
const RESTARTABLE = ['REQUESTED', 'FAILED', 'BLOCKED_LEGAL_HOLD'] as const;

export const DELETED_DISPLAY_NAME = 'Deleted athlete';
export const tombstoneSlug = (athleteId: string) => `deleted-${athleteId}`;
export const tombstoneSupabaseUserId = (userAccountId: string) => `deleted:${userAccountId}`;

// ── tRPC side ───────────────────────────────────────────────────────────────

export async function requestDeletion(
  deps: { prisma: PrismaClient; jobs: JobEnqueuer; log: DeletionLogger },
  caller: { athleteId: string; userAccountId: string; requestId: string },
): Promise<DataLifecycleRequestOwnerOutput> {
  const { prisma, jobs, log } = deps;

  const existing = await prisma.dataLifecycleRequest.findFirst({
    where: {
      athleteId: caller.athleteId,
      requestType: 'DELETION',
      status: { in: [...RESTARTABLE, 'IN_PROGRESS'] },
    },
    orderBy: { createdAt: 'desc' },
    select: ownerOutputSelect,
  });

  // Persist BEFORE enqueue (AGENTS.md Background jobs).
  const request =
    existing ??
    (await prisma.dataLifecycleRequest.create({
      data: {
        athleteId: caller.athleteId,
        requestedBy: caller.userAccountId,
        requestType: 'DELETION',
        status: 'REQUESTED',
      },
      select: ownerOutputSelect,
    }));

  // An IN_PROGRESS run is already being processed; don't stack another job.
  if (request.status !== 'IN_PROGRESS') {
    try {
      await jobs.enqueue(QUEUE_NAMES.PII_DELETION, {
        dataLifecycleRequestId: request.id,
        athleteId: caller.athleteId,
        requestedAt: request.createdAt.toISOString(),
        requestId: caller.requestId,
      });
    } catch (error) {
      log.error(
        {
          event: 'pii_deletion_enqueue_failed',
          requestId: caller.requestId,
          dataLifecycleRequestId: request.id,
          error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        },
        'could not enqueue deletion job',
      );
      // The request row stays; calling again re-enqueues it.
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Your deletion request was recorded but could not be scheduled. Please try again.',
      });
    }
  }
  log.info(
    { event: 'pii_deletion_requested', requestId: caller.requestId, dataLifecycleRequestId: request.id },
    'deletion requested',
  );
  return request;
}

// ── Worker side ─────────────────────────────────────────────────────────────

export interface PiiDeletionInput {
  dataLifecycleRequestId: string;
  athleteId: string;
  requestId: string;
}

export type PiiDeletionOutcome =
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED_LEGAL_HOLD'
  | 'SKIPPED';

export async function runPiiDeletion(
  deps: { prisma: PrismaClient; externals: DeletionExternals; log: DeletionLogger },
  input: PiiDeletionInput,
): Promise<PiiDeletionOutcome> {
  const { prisma, log } = deps;
  const logCtx = {
    requestId: input.requestId,
    dataLifecycleRequestId: input.dataLifecycleRequestId,
    athleteId: input.athleteId,
  };

  const request = await prisma.dataLifecycleRequest.findUnique({
    where: { id: input.dataLifecycleRequestId },
    select: { status: true, athleteId: true, requestType: true },
  });
  if (request === null || request.athleteId !== input.athleteId || request.requestType !== 'DELETION') {
    log.error({ event: 'pii_deletion_invalid_job', ...logCtx }, 'deletion job does not match a deletion request');
    return 'SKIPPED';
  }
  if (request.status === 'COMPLETED' || request.status === 'IN_PROGRESS') {
    log.info({ event: 'pii_deletion_already_handled', ...logCtx, status: request.status }, 'nothing to do');
    return 'SKIPPED';
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: input.athleteId },
    select: { isUnderLegalHold: true, userAccountId: true, userAccount: { select: { supabaseUserId: true } } },
  });
  if (athlete === null) {
    log.error({ event: 'pii_deletion_invalid_job', ...logCtx }, 'athlete not found');
    return 'SKIPPED';
  }

  if (athlete.isUnderLegalHold) {
    await prisma.dataLifecycleRequest.update({
      where: { id: input.dataLifecycleRequestId },
      data: { status: 'BLOCKED_LEGAL_HOLD' },
      select: { id: true },
    });
    log.warn({ event: 'pii_deletion_blocked', ...logCtx }, 'Deletion blocked by legal hold');
    return 'BLOCKED_LEGAL_HOLD';
  }

  const claimed = await prisma.dataLifecycleRequest.updateMany({
    where: { id: input.dataLifecycleRequestId, status: { in: [...RESTARTABLE] } },
    data: { status: 'IN_PROGRESS' },
  });
  if (claimed.count === 0) {
    log.info({ event: 'pii_deletion_already_handled', ...logCtx }, 'claimed by another job');
    return 'SKIPPED';
  }
  log.info({ event: 'pii_deletion_started', ...logCtx }, 'deletion started');

  try {
    await deleteAthleteRows(prisma, input.athleteId, athlete.userAccountId, input.dataLifecycleRequestId);

    const paths = await deps.externals.listStorageObjects(`${input.athleteId}/`);
    if (paths.length > 0) await deps.externals.removeStorageObjects(paths);

    // Only while the account still carries the real id (idempotent on retry).
    const supabaseUserId = athlete.userAccount.supabaseUserId;
    if (supabaseUserId !== tombstoneSupabaseUserId(athlete.userAccountId)) {
      await deps.externals.deleteAuthUser(supabaseUserId);
    }

    await tombstone(prisma, input.athleteId, athlete.userAccountId);
  } catch (error) {
    await markFailed(prisma, input.dataLifecycleRequestId);
    log.error(
      {
        event: 'pii_deletion_attempt_failed',
        ...logCtx,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      'deletion attempt failed; request left FAILED for retry',
    );
    throw error;
  }

  const residue = await verifyDeletion(deps, {
    athleteId: input.athleteId,
    userAccountId: athlete.userAccountId,
    dataLifecycleRequestId: input.dataLifecycleRequestId,
  });
  if (residue.length > 0) {
    await markFailed(prisma, input.dataLifecycleRequestId);
    // AGENTS.md Retention & Legal Hold: verification failure → FAILED + owner alert.
    log.error(
      { event: 'pii_deletion_incomplete', ...logCtx, residue },
      'Deletion verification failed; project owner action required',
    );
    return 'FAILED';
  }

  await prisma.dataLifecycleRequest.update({
    where: { id: input.dataLifecycleRequestId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    select: { id: true },
  });
  log.info({ event: 'pii_deletion_completed', ...logCtx }, 'deletion completed and verified');
  return 'COMPLETED';
}

async function markFailed(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.dataLifecycleRequest.update({
    where: { id },
    data: { status: 'FAILED' },
    select: { id: true },
  });
}

/** Every athlete-FK table except the retained ones, in FK order, in one transaction. */
async function deleteAthleteRows(
  prisma: PrismaClient,
  athleteId: string,
  userAccountId: string,
  keepRequestId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const where = { athleteId };

    await tx.athleteMetricEntry.deleteMany({ where });
    await tx.athleteMetricSummary.deleteMany({ where });
    await tx.clubMembership.deleteMany({ where });
    await tx.athleteVisibilitySettings.deleteMany({ where });

    // Keep the other party's cached connection count truthful.
    const accepted = await tx.athleteConnection.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: athleteId }, { addresseeId: athleteId }] },
      select: { requesterId: true, addresseeId: true },
    });
    const others = accepted.map((c) => (c.requesterId === athleteId ? c.addresseeId : c.requesterId));
    if (others.length > 0) {
      await tx.athletePublicProfile.updateMany({
        where: { athleteId: { in: others }, connectionCountCache: { gt: 0 } },
        data: { connectionCountCache: { decrement: 1 } },
      });
    }
    await tx.athleteConnection.deleteMany({
      where: { OR: [{ requesterId: athleteId }, { addresseeId: athleteId }] },
    });

    await tx.athleteAchievement.deleteMany({ where });
    // Public profile references a photo asset; it goes before the assets.
    await tx.athletePublicProfile.deleteMany({ where });
    await tx.athletePrivateProfile.deleteMany({ where });
    await tx.profilePhotoAsset.deleteMany({ where });
    await tx.dataLifecycleRequest.deleteMany({ where: { athleteId, id: { not: keepRequestId } } });
    // Account-level personal data (D9): push tokens identify the person's devices.
    await tx.deviceToken.deleteMany({ where: { userAccountId } });
    // Retained (D8a): audit_log, pii_consent_log, the driving lifecycle request.
  });
}

async function tombstone(prisma: PrismaClient, athleteId: string, userAccountId: string): Promise<void> {
  await prisma.$transaction([
    prisma.athlete.update({
      where: { id: athleteId },
      data: { slug: tombstoneSlug(athleteId), displayName: DELETED_DISPLAY_NAME, profileStatus: 'HIDDEN' },
      select: { id: true },
    }),
    prisma.userAccount.update({
      where: { id: userAccountId },
      data: { supabaseUserId: tombstoneSupabaseUserId(userAccountId), status: 'DEACTIVATED' },
      select: { id: true },
    }),
  ]);
}

/**
 * Post-deletion verification (D8a). Returns the names of what remains;
 * empty means verified. Never returns row contents.
 */
export async function verifyDeletion(
  deps: { prisma: PrismaClient; externals: DeletionExternals },
  target: { athleteId: string; userAccountId: string; dataLifecycleRequestId: string },
): Promise<string[]> {
  const { prisma } = deps;
  const { athleteId } = target;
  const where = { athleteId };

  const counts: Record<string, number> = {
    athlete_metric_entries: await prisma.athleteMetricEntry.count({ where }),
    athlete_metric_summaries: await prisma.athleteMetricSummary.count({ where }),
    club_memberships: await prisma.clubMembership.count({ where }),
    athlete_visibility_settings: await prisma.athleteVisibilitySettings.count({ where }),
    athlete_connections: await prisma.athleteConnection.count({
      where: { OR: [{ requesterId: athleteId }, { addresseeId: athleteId }] },
    }),
    athlete_achievements: await prisma.athleteAchievement.count({ where }),
    athlete_public_profiles: await prisma.athletePublicProfile.count({ where }),
    athlete_private_profiles: await prisma.athletePrivateProfile.count({ where }),
    profile_photo_assets: await prisma.profilePhotoAsset.count({ where }),
    data_lifecycle_requests: await prisma.dataLifecycleRequest.count({
      where: { athleteId, id: { not: target.dataLifecycleRequestId } },
    }),
    device_tokens: await prisma.deviceToken.count({ where: { userAccountId: target.userAccountId } }),
  };
  const residue = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([table]) => table);

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { slug: true, displayName: true, profileStatus: true },
  });
  if (
    athlete !== null &&
    (athlete.slug !== tombstoneSlug(athleteId) ||
      athlete.displayName !== DELETED_DISPLAY_NAME ||
      athlete.profileStatus !== 'HIDDEN')
  ) {
    residue.push('athletes (not anonymized)');
  }
  const account = await prisma.userAccount.findUnique({
    where: { id: target.userAccountId },
    select: { supabaseUserId: true },
  });
  if (account !== null && account.supabaseUserId !== tombstoneSupabaseUserId(target.userAccountId)) {
    residue.push('user_accounts (not anonymized)');
  }

  if ((await deps.externals.listStorageObjects(`${athleteId}/`)).length > 0) {
    residue.push('storage profile-photos');
  }
  return residue;
}
