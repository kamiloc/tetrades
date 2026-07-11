/**
 * Queue infrastructure lifecycle (Sprint 4, task 4.1).
 *
 * App-side wiring on top of @packages/queue: this module stays in apps/api
 * because it assembles the app's workers (src/jobs/*) and injects Prisma —
 * packages never import from apps. The reusable pieces (connection factory,
 * queue registry, worker scaffold, job payload types) live in the package.
 *
 * startQueueInfrastructure() is called once by buildServer() when
 * UPSTASH_REDIS_URL is configured. It creates the shared Redis connection,
 * the queue registry, and the four workers, and hands back a handle whose
 * close() runs the graceful shutdown sequence.
 *
 * Shutdown ORDER MATTERS and is fixed here (and locked by a unit test):
 *   1. workers  — Worker.close() stops fetching and waits for in-flight
 *                 jobs to settle (drain)
 *   2. queues   — release Queue handles
 *   3. redis    — quit the shared connection LAST; closing it while a
 *                 worker is active loses the active job
 */
import { closeRedis, createQueueRegistry, createRedisConnection } from '@packages/queue';
import type { QueueRegistry, WorkerHandle } from '@packages/queue';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { createDeletePIIWorker } from '../jobs/deletePII.js';
import { createOptimizeImageWorker } from '../jobs/optimizeImage.js';
import { createProcessOCRWorker } from '../jobs/processOCR.js';
import { createSendNotificationWorker } from '../jobs/sendNotification.js';

export interface QueueInfrastructure {
  connection: Redis;
  registry: QueueRegistry;
  workers: WorkerHandle[];
  /** Graceful shutdown: drain workers, then close queues, then Redis. */
  close: () => Promise<void>;
}

/**
 * The shutdown sequence, isolated from BullMQ so its ordering guarantee is
 * unit-testable with fakes: workers drain first, Redis closes last.
 */
export async function runShutdownSequence(
  steps: {
    closeWorkers: () => Promise<void>;
    closeQueues: () => Promise<void>;
    closeRedis: () => Promise<void>;
  },
  logger: FastifyBaseLogger,
): Promise<void> {
  logger.info({ event: 'queue_shutdown_started' }, 'draining workers');
  await steps.closeWorkers();
  logger.info({ event: 'queue_workers_drained' }, 'workers drained, closing queues');
  await steps.closeQueues();
  await steps.closeRedis();
  logger.info({ event: 'queue_shutdown_complete' }, 'queue infrastructure closed');
}

export function startQueueInfrastructure(
  redisUrl: string,
  logger: FastifyBaseLogger,
  // Injected (not imported from lib/prisma.js) so importing this module never
  // triggers lib/prisma's import-time env validation in unit tests.
  prisma: PrismaClient,
): QueueInfrastructure {
  const connection = createRedisConnection(redisUrl, logger);
  const registry = createQueueRegistry(connection);

  const workers: WorkerHandle[] = [
    createProcessOCRWorker(connection, logger, prisma),
    createOptimizeImageWorker(connection, logger),
    createDeletePIIWorker(connection, logger),
    createSendNotificationWorker(connection, logger),
  ];

  logger.info(
    { event: 'queue_workers_started', queues: workers.map((w) => w.queueName) },
    'queue workers started',
  );

  return {
    connection,
    registry,
    workers,
    close: () =>
      runShutdownSequence(
        {
          closeWorkers: async () => {
            await Promise.all(workers.map((handle) => handle.close()));
          },
          closeQueues: () => registry.close(),
          closeRedis: () => closeRedis(connection),
        },
        logger,
      ),
  };
}
