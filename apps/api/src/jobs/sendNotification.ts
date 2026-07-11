/**
 * notifications worker — STUB (Sprint 4, task 4.1).
 *
 * Task 5.10 replaces the processor with expo-notifications push delivery
 * (device tokens resolved server-side; tokens are L1-INTERNAL and never
 * travel through job payloads). Until then any enqueued job fails loudly
 * with 'not implemented' so an accidental enqueue is immediately visible.
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { WorkerHandle } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';

export function createSendNotificationWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.NOTIFICATIONS,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_NOTIFICATIONS,
    logger,
    processor: () => {
      throw new Error('not implemented');
    },
  });
}
