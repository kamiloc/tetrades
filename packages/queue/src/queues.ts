/**
 * Queue instances and the shared retry/retention policy.
 *
 * The registry instantiates the four application queues on the shared
 * ioredis connection from connection.ts. apps/api's buildServer() owns the
 * returned registry and closes it during graceful shutdown, after workers
 * have drained.
 */
import { Queue } from 'bullmq';
import type { DefaultJobOptions } from 'bullmq';
import type { Redis } from 'ioredis';

import { QUEUE_NAMES } from './types.js';
import type {
  ImageOptimizationJobData,
  NotificationJobData,
  OcrProcessingJobData,
  PiiDeletionJobData,
  QueueJobData,
  QueueName,
} from './types.js';

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

/** Instantiate the four application queues on the shared Redis connection. */
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
