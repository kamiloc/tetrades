/**
 * image-optimization worker (ADR-010, ADR-015).
 *
 * Wiring only: validation, the sharp pipeline, and the row/state handling
 * live in services/profilePhoto.ts so they are testable without Redis.
 * Retries use the shared policy (3 attempts, exponential backoff); a thrown
 * attempt leaves the ORIGINAL row FAILED, and the next attempt re-claims it.
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { WorkerHandle } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { createSupabasePhotoStorage } from '../lib/supabaseAdmin.js';
import { runImageOptimization } from '../services/profilePhoto.js';

export function createOptimizeImageWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  const storage = createSupabasePhotoStorage();
  return createQueueWorker({
    queueName: QUEUE_NAMES.IMAGE_OPTIMIZATION,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_IMAGE,
    logger,
    processor: async (job) => {
      await runImageOptimization(
        { prisma, storage, log: logger },
        {
          athleteId: job.data.athleteId,
          originalPath: job.data.originalPath,
          requestId: job.data.requestId,
        },
      );
    },
  });
}
