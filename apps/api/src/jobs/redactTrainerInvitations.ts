/**
 * trainer-invitation-redaction worker (ADR-017, design D13; trainer-provisioning
 * spec "Ended invitations lose their email after 90 days").
 *
 * The project's first recurring job: scheduled daily at API startup with
 * BullMQ's upsertJobScheduler (scheduleTrainerInvitationRedaction). Every run
 * replaces the email of each invitation that ended more than 90 days ago with
 * `redacted:<id>` and sets redacted_at, keeping status, club and dates:
 *   - DECLINED or REVOKED, by responded_at;
 *   - PENDING past expiry (expired), by expires_at;
 *   - ACCEPTED, 90 days after its trainer row was revoked. An accepted
 *     invitation keeps its email while that trainer is active. When a
 *     revoked trainer is restored by a new invitation, acceptInvitation
 *     redacts the superseded accepted ones at once (this query only sees the
 *     row's current revoked_at), so at most one unredacted accepted
 *     invitation per (club, account) remains for this job.
 *
 * One set-based UPDATE per category (approved raw SQL: Prisma can't set a
 * column from another column). Each statement is atomic and filters on
 * redacted_at IS NULL, so a failed run leaves already-redacted rows marked,
 * a retry or the next day's run picks up the rest, and re-running changes
 * nothing. The redaction marker is the only email change the transition
 * trigger allows. Logs carry counts and the requestId, never an email.
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { QueueRegistry, WorkerHandle } from '@packages/queue';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { prisma } from '../lib/prisma.js';

export const TRAINER_INVITATION_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed id: upsertJobScheduler with it is idempotent across restarts and instances. */
export const REDACTION_SCHEDULER_ID = 'trainer-invitation-redaction-daily';
/** Every day at 03:15 UTC (22:15 in Colombia), outside peak use. */
export const REDACTION_CRON = '15 3 * * *';
/** Correlation id carried by every scheduled run (the scheduler's data is static). */
export const REDACTION_REQUEST_ID = 'scheduled:trainer-invitation-redaction';

export interface RedactionCounts {
  declinedOrRevoked: number;
  expired: number;
  acceptedAfterRevocation: number;
}

export interface RedactionLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

export async function runTrainerInvitationRedaction(
  deps: { prisma: PrismaClient; log: RedactionLogger },
  input: { requestId: string },
  now: Date = new Date(),
): Promise<RedactionCounts> {
  const cutoff = new Date(now.getTime() - TRAINER_INVITATION_RETENTION_DAYS * DAY_MS);

  const declinedOrRevoked = await deps.prisma.$executeRaw`
    UPDATE club_trainer_invitations
    SET email = 'redacted:' || id, redacted_at = ${now}
    WHERE redacted_at IS NULL
      AND status IN ('DECLINED', 'REVOKED')
      AND responded_at < ${cutoff}`;

  const expired = await deps.prisma.$executeRaw`
    UPDATE club_trainer_invitations
    SET email = 'redacted:' || id, redacted_at = ${now}
    WHERE redacted_at IS NULL
      AND status = 'PENDING'
      AND expires_at < ${cutoff}`;

  const acceptedAfterRevocation = await deps.prisma.$executeRaw`
    UPDATE club_trainer_invitations AS inv
    SET email = 'redacted:' || inv.id, redacted_at = ${now}
    WHERE inv.redacted_at IS NULL
      AND inv.status = 'ACCEPTED'
      AND EXISTS (
        SELECT 1 FROM club_trainers ct
        WHERE ct.club_id = inv.club_id
          AND ct.user_account_id = inv.accepted_by_user_account_id
          AND ct.revoked_at < ${cutoff}
      )`;

  const counts = { declinedOrRevoked, expired, acceptedAfterRevocation };
  deps.log.info(
    { event: 'trainer_invitation_redaction_completed', requestId: input.requestId, ...counts },
    'trainer invitation emails redacted',
  );
  return counts;
}

export function createRedactTrainerInvitationsWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.TRAINER_INVITATION_REDACTION,
    connection,
    // One run at a time; the statements are set-based and run in seconds.
    concurrency: 1,
    logger,
    processor: async (job) => {
      // Scheduled runs share the scheduler's static requestId; the job id
      // makes each run's log lines distinct.
      await runTrainerInvitationRedaction(
        { prisma, log: logger },
        { requestId: `${job.data.requestId}:${job.id ?? 'unknown'}` },
      );
    },
  });
}

/**
 * Registers (or updates) the daily schedule. Idempotent: the fixed scheduler
 * id means restarts and multiple API instances keep exactly one schedule.
 * Jobs inherit the queue's default retries and backoff.
 */
export async function scheduleTrainerInvitationRedaction(
  registry: QueueRegistry,
  logger: FastifyBaseLogger,
): Promise<void> {
  await registry.queues[QUEUE_NAMES.TRAINER_INVITATION_REDACTION].upsertJobScheduler(
    REDACTION_SCHEDULER_ID,
    { pattern: REDACTION_CRON, tz: 'UTC' },
    { name: 'redact', data: { requestId: REDACTION_REQUEST_ID } },
  );
  logger.info(
    { event: 'job_scheduler_registered', schedulerId: REDACTION_SCHEDULER_ID, pattern: REDACTION_CRON },
    'trainer invitation redaction scheduled',
  );
}
