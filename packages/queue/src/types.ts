/**
 * Queue names and job data contracts — the single source of truth.
 *
 * Consumers import names from QUEUE_NAMES; inline queue-name string
 * literals are forbidden anywhere else. The job data interfaces are the
 * contracts the Sprint 4/5 processors implement against:
 *   - image-optimization   → apps/api/src/jobs/optimizeImage.ts    (4.6)
 *   - pii-deletion         → apps/api/src/jobs/deletePII.ts        (4.7)
 *   - notifications        → apps/api/src/jobs/sendNotification.ts (5.10)
 *
 * Payload rules (AGENTS.md, Background Jobs):
 *   - serializable data only — ids and enums, no Buffers or class instances
 *   - EVERY payload carries requestId for tRPC → enqueue → worker tracing
 *   - ids only, never values: payloads reference DB rows; nothing L2 or L3
 *     travels through Redis, which is outside the
 *     encrypted-at-rest boundary of @packages/crypto.
 */

export const QUEUE_NAMES = {
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
  /** DataLifecycleRequest (type DELETION) the worker drives through its statuses. */
  dataLifecycleRequestId: string;
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
  notificationType: 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'CLUB_INVITATION';
  /** Row the notification is about (e.g. connection id). */
  subjectId: string;
}

/** Payload type per queue — keeps Queue/Worker generics in lockstep. */
export interface QueueJobData {
  [QUEUE_NAMES.IMAGE_OPTIMIZATION]: ImageOptimizationJobData;
  [QUEUE_NAMES.PII_DELETION]: PiiDeletionJobData;
  [QUEUE_NAMES.NOTIFICATIONS]: NotificationJobData;
}

/**
 * Structured logger contract for this package. Deliberately minimal so a
 * Pino/Fastify logger is directly assignable — this package's contract
 * allows only bullmq and ioredis imports, so it must not name Fastify's
 * logger type. Callers pass `server.log` (or any Pino instance).
 */
export interface QueueLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}
