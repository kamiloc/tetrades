/**
 * pii-deletion worker — STUB (Sprint 4, task 4.1).
 *
 * Task 4.7 replaces the processor with the Habeas Data cascade delete
 * (legal-hold check → cascade across tables and Storage → post-deletion
 * verification). Until then any enqueued job fails loudly with
 * 'not implemented' so an accidental enqueue is immediately visible.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { QUEUE_NAMES } from '../queue/registry.js';
import { createQueueWorker } from '../queue/worker.js';
import type { WorkerHandle } from '../queue/worker.js';

export function createDeletePIIWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.PII_DELETION,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_PII,
    logger,
    processor: () => {
      throw new Error('not implemented');
    },
  });
}
