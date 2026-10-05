/**
 * pii-deletion worker (athlete-data-lifecycle spec, design D8 / D8a).
 *
 * Wiring only: the deletion, legal-hold check, tombstone, and verification
 * live in services/dataLifecycle.ts so they are testable without Redis.
 * Retries use the shared policy (3 attempts, exponential backoff); a thrown
 * attempt leaves the request FAILED, and the next attempt resumes it.
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { WorkerHandle } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { createSupabaseDeletionExternals } from '../lib/supabaseAdmin.js';
import { runPiiDeletion } from '../services/dataLifecycle.js';

export function createDeletePIIWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  const externals = createSupabaseDeletionExternals();
  return createQueueWorker({
    queueName: QUEUE_NAMES.PII_DELETION,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_PII,
    logger,
    processor: async (job) => {
      await runPiiDeletion(
        { prisma, externals, log: logger },
        {
          dataLifecycleRequestId: job.data.dataLifecycleRequestId,
          athleteId: job.data.athleteId,
          requestId: job.data.requestId,
        },
      );
    },
  });
}
