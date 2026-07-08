/**
 * Queue registry (Sprint 4, task 4.1) — the single source of truth for
 * queue names, job data contracts, and default job options.
 *
 * Queue and worker files import names from QUEUE_NAMES; inline queue-name
 * string literals are forbidden anywhere else. The job data interfaces are
 * the contracts the Sprint 4/5 processors implement against:
 *   - ocr-processing       → apps/api/src/jobs/processOCR.ts       (4.2)
 *   - image-optimization   → apps/api/src/jobs/optimizeImage.ts    (4.6)
 *   - pii-deletion         → apps/api/src/jobs/deletePII.ts        (4.7)
 *   - notifications        → apps/api/src/jobs/sendNotification.ts (5.10)
 *
 * Payload rules (CLAUDE.md, Background Jobs):
 *   - serializable data only — ids and enums, no Buffers or class instances
 *   - EVERY payload carries requestId for tRPC → enqueue → worker tracing
 *   - ids only, never values: payloads reference DB rows; nothing L2 (medical
 *     values, documents) or L3 travels through Redis, which is outside the
 *     encrypted-at-rest boundary of @packages/crypto.
 */
import { Queue } from 'bullmq';
import type { DefaultJobOptions } from 'bullmq';
import type { Redis } from 'ioredis';

export const QUEUE_NAMES = {
  OCR_PROCESSING: 'ocr-processing',
  IMAGE_OPTIMIZATION: 'image-optimization',
  PII_DELETION: 'pii-deletion',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Every job payload in the system carries the originating requestId. */
export interface BaseJobData {
  /** Correlation id from the tRPC request that enqueued the job. */
  requestId: string;
}

/** ocr-processing — extract medical data from an uploaded document (4.2). */
export interface OcrProcessingJobData extends BaseJobData {
  /** MedicalDocument row to process; must be in status UPLOADED. */
  documentId: string;
  /** Owning athlete — storage prefix and audit target. */
  athleteId: string;
}

/** image-optimization — generate EXIF-stripped WebP variants (4.6). */
export interface ImageOptimizationJobData extends BaseJobData {
  /** Owning athlete — storage prefix `profile-photos/{athleteId}/`. */
  athleteId: string;
  /**
   * Path of the original upload inside the profile-photos bucket
   * (L1-INTERNAL — may still contain EXIF metadata).
   */
  originalPath: string;
}

/** pii-deletion — cascade-delete an athlete's data (4.7, Habeas Data). */
export interface PiiDeletionJobData extends BaseJobData {
  /** Athlete whose data is being deleted. */
  athleteId: string;
  /** ISO 8601 timestamp of the athlete's deletion request (30-day SLA). */
  requestedAt: string;
}

/** notifications — send a push notification (5.10). */
export interface NotificationJobData extends BaseJobData {
  /** Recipient UserAccount id — the worker resolves device tokens itself. */
  userAccountId: string;
  /** Template key; the worker owns copy so no free text sits in Redis. */
  notificationType:
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_ACCEPTED'
    | 'DOCUMENT_VERIFIED'
    | 'DOCUMENT_REJECTED';
  /** Row the notification is about (connection id, document id, ...). */
  subjectId: string;
}

/** Payload type per queue — keeps Queue/Worker generics in lockstep. */
export interface QueueJobData {
  [QUEUE_NAMES.OCR_PROCESSING]: OcrProcessingJobData;
  [QUEUE_NAMES.IMAGE_OPTIMIZATION]: ImageOptimizationJobData;
  [QUEUE_NAMES.PII_DELETION]: PiiDeletionJobData;
  [QUEUE_NAMES.NOTIFICATIONS]: NotificationJobData;
}

/**
 * Retry/retention policy shared by all queues (task 4.1 spec): 3 attempts
 * with exponential backoff from 2s; keep the last 100 completed and 200
 * failed jobs for debugging.
 */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

export interface QueueRegistry {
  queues: { [Name in QueueName]: Queue<QueueJobData[Name]> };
  /** Close all Queue handles (not the shared Redis connection). */
  close: () => Promise<void>;
}

/**
 * Instantiate the four application queues on the shared Redis connection.
 * buildServer() owns the returned registry and closes it during graceful
 * shutdown, after workers have drained.
 */
export function createQueueRegistry(connection: Redis): QueueRegistry {
  const queues: QueueRegistry['queues'] = {
    [QUEUE_NAMES.OCR_PROCESSING]: new Queue<OcrProcessingJobData>(QUEUE_NAMES.OCR_PROCESSING, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
    [QUEUE_NAMES.IMAGE_OPTIMIZATION]: new Queue<ImageOptimizationJobData>(
      QUEUE_NAMES.IMAGE_OPTIMIZATION,
      { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
    ),
    [QUEUE_NAMES.PII_DELETION]: new Queue<PiiDeletionJobData>(QUEUE_NAMES.PII_DELETION, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
    [QUEUE_NAMES.NOTIFICATIONS]: new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATIONS, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
  };

  return {
    queues,
    close: async () => {
      await Promise.all(Object.values(queues).map((queue) => queue.close()));
    },
  };
}
