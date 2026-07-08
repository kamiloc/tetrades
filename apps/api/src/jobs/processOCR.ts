/**
 * ocr-processing worker — STUB (Sprint 4, task 4.1).
 *
 * Task 4.2 replaces the processor with the real OCR pipeline (PROCESSING →
 * Claude Vision → ocrRawOutput → ocrParsedData → PENDING_REVIEW, reverting
 * to UPLOADED on failure). Until then any enqueued job fails loudly with
 * 'not implemented' so an accidental enqueue is immediately visible.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { QUEUE_NAMES } from '../queue/registry.js';
import { createQueueWorker } from '../queue/worker.js';
import type { WorkerHandle } from '../queue/worker.js';

export function createProcessOCRWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.OCR_PROCESSING,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_OCR,
    logger,
    processor: () => {
      throw new Error('not implemented');
    },
  });
}
