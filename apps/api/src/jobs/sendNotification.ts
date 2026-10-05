/**
 * notifications worker (membership-notifications spec, design D9).
 *
 * Wiring only: delivery lives in services/notifications.ts. Payloads are
 * identifier-only; tokens are resolved server-side and never sit in Redis.
 * Retries use the shared policy (3 attempts, exponential backoff).
 */
import { createQueueWorker, QUEUE_NAMES } from '@packages/queue';
import type { WorkerHandle } from '@packages/queue';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { sendPushNotification } from '../services/notifications.js';

export function createSendNotificationWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.NOTIFICATIONS,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_NOTIFICATIONS,
    logger,
    processor: async (job) => {
      await sendPushNotification({ prisma, fetch, log: logger }, job.data);
    },
  });
}
