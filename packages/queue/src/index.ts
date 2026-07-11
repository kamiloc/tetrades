/**
 * @packages/queue — BullMQ queue infrastructure (Sprint 4).
 *
 * Exports (per the CLAUDE.md package contract): queue instances, typed job
 * payloads, the shared ioredis connection factory, and the worker scaffold.
 * Job execution logic (processors) lives in apps/api/src/jobs/, never here.
 */
export {
  closeRedis,
  createRedisConnection,
  reconnectBackoffMs,
  type CreateRedisConnectionOptions,
} from './connection.js';
export {
  createQueueRegistry,
  DEFAULT_JOB_OPTIONS,
  type QueueRegistry,
} from './queues.js';
export {
  QUEUE_NAMES,
  type BaseJobData,
  type ImageOptimizationJobData,
  type NotificationJobData,
  type OcrProcessingJobData,
  type PiiDeletionJobData,
  type QueueJobData,
  type QueueLogger,
  type QueueName,
} from './types.js';
export {
  createQueueWorker,
  type CreateQueueWorkerOptions,
  type WorkerHandle,
} from './worker.js';
