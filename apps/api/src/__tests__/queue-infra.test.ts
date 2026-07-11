/**
 * Queue infrastructure unit tests (Sprint 4, task 4.1) — no live Redis.
 *
 * Covers the pieces whose correctness is independent of a broker: the queue
 * name registry and job-option policy, the connection factory's BullMQ- and
 * Upstash-required options, the reconnect backoff curve, the rate-limit
 * store swap point, and — most importantly — the graceful shutdown ORDER
 * (workers drain before Redis closes). Live-broker behavior is covered by
 * src/__tests__/integration/queue-redis.int.test.ts.
 */
import {
  closeRedis,
  createRedisConnection,
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  reconnectBackoffMs,
} from '@packages/queue';
import type {
  ImageOptimizationJobData,
  NotificationJobData,
  OcrProcessingJobData,
  PiiDeletionJobData,
  QueueName,
} from '@packages/queue';
import type { Redis } from 'ioredis';
import { describe, it, expect } from 'vitest';


import { createRateLimitStore } from '../middleware/rateLimit.js';
import { runShutdownSequence } from '../queue/lifecycle.js';

import { makeRecordingLogger, type RecordedLog } from './helpers/recording-logger.js';


// ---------------------------------------------------------------------------
// Queue registry — names and job-option policy from the task 4.1 spec
// ---------------------------------------------------------------------------

describe('queue registry', () => {
  it('exports the four application queue names', () => {
    expect(QUEUE_NAMES.OCR_PROCESSING).toBe('ocr-processing');
    expect(QUEUE_NAMES.IMAGE_OPTIMIZATION).toBe('image-optimization');
    expect(QUEUE_NAMES.PII_DELETION).toBe('pii-deletion');
    expect(QUEUE_NAMES.NOTIFICATIONS).toBe('notifications');
    expect(Object.values(QUEUE_NAMES)).toHaveLength(4);
  });

  it('applies the retry/retention policy to every queue', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: 'exponential', delay: 2000 });
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ count: 100 });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ count: 200 });
  });

  it('job data contracts are exported, fully typed, and all carry requestId', () => {
    // Compile-time contract check: if a payload interface loses a field or
    // its requestId, these literals stop typechecking.
    const ocr: OcrProcessingJobData = {
      documentId: 'doc_1',
      athleteId: 'ath_1',
      requestId: 'req_1',
    };
    const image: ImageOptimizationJobData = {
      athleteId: 'ath_1',
      originalPath: 'ath_1/original.jpg',
      requestId: 'req_2',
    };
    const pii: PiiDeletionJobData = {
      athleteId: 'ath_1',
      requestedAt: '2026-07-07T00:00:00.000Z',
      requestId: 'req_3',
    };
    const notification: NotificationJobData = {
      userAccountId: 'usr_1',
      notificationType: 'CONNECTION_REQUEST',
      subjectId: 'conn_1',
      requestId: 'req_4',
    };

    for (const payload of [ocr, image, pii, notification]) {
      expect(payload.requestId.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Redis connection factory — BullMQ/Upstash-required options, no dialing
// ---------------------------------------------------------------------------

describe('createRedisConnection', () => {
  const lines: RecordedLog[] = [];
  const logger = makeRecordingLogger(lines);

  it('configures the client for BullMQ and Upstash', async () => {
    const connection = createRedisConnection(
      'rediss://default:secret-token@example.upstash.io:6379',
      logger,
      { lazyConnect: true },
    );

    // BullMQ hard requirement — Workers reject connections without it.
    expect(connection.options.maxRetriesPerRequest).toBeNull();
    // Upstash guidance — their proxy does not support the ready check.
    expect(connection.options.enableReadyCheck).toBe(false);
    // rediss:// must turn TLS on (Upstash is TLS-only).
    expect(connection.options.tls).toBeDefined();
    expect(connection.options.retryStrategy).toBe(reconnectBackoffMs);

    await closeRedis(connection);
  });

  it('plain redis:// (local/CI broker) does not enable TLS', async () => {
    const connection = createRedisConnection('redis://127.0.0.1:6379', logger, {
      lazyConnect: true,
    });
    expect(connection.options.tls).toBeUndefined();
    await closeRedis(connection);
  });

  it('reconnect backoff is exponential from 1s and capped at 30s', () => {
    expect(reconnectBackoffMs(1)).toBe(1000);
    expect(reconnectBackoffMs(2)).toBe(2000);
    expect(reconnectBackoffMs(5)).toBe(16_000);
    expect(reconnectBackoffMs(6)).toBe(30_000);
    expect(reconnectBackoffMs(50)).toBe(30_000);
  });
});

// ---------------------------------------------------------------------------
// Rate-limit store swap point — Redis when a connection exists
// ---------------------------------------------------------------------------

describe('createRateLimitStore (task 4.1 Redis swap)', () => {
  it('passes the shared connection through to @fastify/rate-limit', () => {
    const fakeRedis = { status: 'ready' } as unknown as Redis;
    const store = createRateLimitStore(fakeRedis);
    expect(store.redis).toBe(fakeRedis);
    expect(store.store).toBeUndefined();
  });

  it('stays in-memory when no connection is provided', () => {
    const store = createRateLimitStore();
    expect(store.redis).toBeUndefined();
    expect(store.store).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown — workers drain BEFORE the Redis connection closes
// ---------------------------------------------------------------------------

describe('runShutdownSequence', () => {
  it('closes workers, then queues, then Redis — strictly in that order', async () => {
    const order: string[] = [];
    const lines: RecordedLog[] = [];

    // Async delays simulate a worker draining an in-flight job: if the
    // sequence did not await each step, redis would close while the worker
    // is still active and this ordering assertion would fail.
    await runShutdownSequence(
      {
        closeWorkers: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          order.push('workers');
        },
        closeQueues: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          order.push('queues');
        },
        closeRedis: async () => {
          order.push('redis');
        },
      },
      makeRecordingLogger(lines),
    );

    expect(order).toEqual(['workers', 'queues', 'redis']);

    const events = lines.map((line) => line.obj['event']);
    expect(events).toEqual([
      'queue_shutdown_started',
      'queue_workers_drained',
      'queue_shutdown_complete',
    ]);
  });

  it('a failing drain step propagates and Redis is left open (no job loss)', async () => {
    const order: string[] = [];

    await expect(
      runShutdownSequence(
        {
          closeWorkers: () => Promise.reject(new Error('drain failed')),
          closeQueues: async () => {
            order.push('queues');
          },
          closeRedis: async () => {
            order.push('redis');
          },
        },
        makeRecordingLogger([]),
      ),
    ).rejects.toThrow('drain failed');

    // Redis must never be closed ahead of a worker that did not drain.
    expect(order).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Type-level guard: QueueName covers exactly the registry values
// ---------------------------------------------------------------------------

it('QueueName is the union of registry values', () => {
  const names: QueueName[] = [
    QUEUE_NAMES.OCR_PROCESSING,
    QUEUE_NAMES.IMAGE_OPTIMIZATION,
    QUEUE_NAMES.PII_DELETION,
    QUEUE_NAMES.NOTIFICATIONS,
  ];
  expect(new Set(names).size).toBe(4);
});
