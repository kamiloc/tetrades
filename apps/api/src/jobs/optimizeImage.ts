/**
 * image-optimization worker — STUB (Sprint 4, task 4.1).
 *
 * Task 4.6 replaces the processor with the sharp pipeline (EXIF strip +
 * thumb-150/card-400/full-1200 WebP variants). Until then any enqueued job
 * fails loudly with 'not implemented' so an accidental enqueue is
 * immediately visible.
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { WorkerHandle } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';

export function createOptimizeImageWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.IMAGE_OPTIMIZATION,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_IMAGE,
    logger,
    processor: () => {
      throw new Error('not implemented');
    },
  });
}
