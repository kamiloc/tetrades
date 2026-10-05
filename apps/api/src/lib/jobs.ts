/**
 * Job port for tRPC procedures (persist-before-enqueue, AGENTS.md Background
 * jobs). Procedures enqueue through ctx.jobs and never touch BullMQ or Redis
 * directly. buildServer() wires the real registry; integration tests inject a
 * recorder through BuildServerOptions.jobs.
 */
import type { QueueJobData, QueueName, QueueRegistry } from '@packages/queue';

export interface JobEnqueuer {
  enqueue<Name extends QueueName>(queue: Name, data: QueueJobData[Name]): Promise<void>;
}

export class JobsUnavailableError extends Error {
  constructor() {
    super('Background jobs are disabled (UPSTASH_REDIS_URL not set)');
    this.name = 'JobsUnavailableError';
  }
}

export function createRegistryEnqueuer(registry: QueueRegistry): JobEnqueuer {
  return {
    async enqueue(queue, data) {
      // The registry is keyed per queue name; widen once to call add() generically.
      const target = registry.queues[queue] as unknown as {
        add: (name: string, data: QueueJobData[typeof queue]) => Promise<unknown>;
      };
      await target.add(queue, data);
    },
  };
}

/** Used when Redis is not configured (bare dev setups, unit tests). */
export const disabledJobEnqueuer: JobEnqueuer = {
  enqueue() {
    return Promise.reject(new JobsUnavailableError());
  },
};
