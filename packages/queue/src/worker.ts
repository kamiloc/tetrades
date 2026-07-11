/**
 * Shared BullMQ worker scaffolding.
 *
 * Every worker in apps/api/src/jobs/ is built through createQueueWorker so
 * that lifecycle logging and graceful shutdown behave identically across
 * queues. Job execution logic (the processors) stays in apps/api — this
 * package only provides the typed scaffold around it.
 *
 * Job *data* is never logged — payloads are id-only by contract (types.ts),
 * but the logging rule is enforced here regardless: only jobId, queue name,
 * requestId, attempt counts, and error name/message reach a log line.
 */
import { Worker } from 'bullmq';
import type { Job, Processor } from 'bullmq';
import type { Redis } from 'ioredis';

import type { QueueJobData, QueueLogger, QueueName } from './types.js';

export interface WorkerHandle {
  /** Queue this worker consumes — exposed for logging and tests. */
  queueName: QueueName;
  worker: Worker;
  /**
   * Graceful drain: stops taking new jobs and waits for the in-flight job
   * to settle before resolving (BullMQ Worker.close(false)). Must complete
   * before the shared Redis connection is closed.
   */
  close: () => Promise<void>;
}

export interface CreateQueueWorkerOptions<Name extends QueueName> {
  queueName: Name;
  connection: Redis;
  concurrency: number;
  logger: QueueLogger;
  processor: Processor<QueueJobData[Name]>;
}

/** requestId comes from the payload contract; '' only for malformed jobs. */
function requestIdOf(job: Job | undefined): string {
  return job?.data !== null &&
    typeof job?.data === 'object' &&
    'requestId' in job.data &&
    typeof job.data.requestId === 'string'
    ? job.data.requestId
    : '';
}

export function createQueueWorker<Name extends QueueName>(
  options: CreateQueueWorkerOptions<Name>,
): WorkerHandle {
  const { queueName, connection, concurrency, logger, processor } = options;

  const worker = new Worker<QueueJobData[Name]>(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('active', (job) => {
    logger.info(
      { event: 'job_started', queue: queueName, jobId: job.id, requestId: requestIdOf(job) },
      'job started',
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      { event: 'job_completed', queue: queueName, jobId: job.id, requestId: requestIdOf(job) },
      'job completed',
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        event: 'job_failed',
        queue: queueName,
        jobId: job?.id,
        requestId: requestIdOf(job),
        attemptsMade: job?.attemptsMade,
        error: { name: err.name, message: err.message },
      },
      'job failed',
    );
  });

  worker.on('error', (err: Error) => {
    // Worker-level errors (connection loss, stalled checks) — not job failures.
    logger.error(
      { event: 'worker_error', queue: queueName, error: { name: err.name, message: err.message } },
      'worker error',
    );
  });

  return {
    queueName,
    worker,
    close: () => worker.close(),
  };
}
