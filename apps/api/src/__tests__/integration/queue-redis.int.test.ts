/**
 * Redis-backed queue infrastructure integration tests (Sprint 4, task 4.1).
 *
 * Requires a reachable Redis at UPSTASH_REDIS_URL (Upstash, or any local/CI
 * Redis via redis://). Groups are skipped with a loud warning when the URL
 * is absent, following the authReady/dbReady capability-gate pattern.
 *
 * Covers the live-broker success criteria:
 *   4. the connection factory connects and logs at info level
 *   5. graceful shutdown drains workers before Redis closes (logged sequence)
 *   6. rate-limit counters persist across server restarts (Redis keys)
 *   plus: an OCR job for a nonexistent document fails loudly and its
 *   failure log carries the payload requestId (worker-level plumbing; the
 *   OCR pipeline itself is covered by process-ocr.int.test.ts).
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { Redis } from 'ioredis';
import { describe, it, expect, afterAll } from 'vitest';

import { startQueueInfrastructure } from '../../queue/lifecycle.js';
import { closeRedis, createRedisConnection } from '../../queue/redis.js';
import { QUEUE_NAMES } from '../../queue/registry.js';
import { makeRecordingLogger, type RecordedLog } from '../helpers/recording-logger.js';

import { dbReady, prisma, startServer } from './helpers/setup.js';

const REDIS_URL = process.env['UPSTASH_REDIS_URL'] ?? '';
const redisReady = REDIS_URL.length > 0;

if (!redisReady) {
  console.warn(
    '[integration] UPSTASH_REDIS_URL missing — Redis-backed queue/rate-limit ' +
      'test groups will be SKIPPED.',
  );
}

/** @fastify/rate-limit RedisStore default key namespace. */
const RATE_LIMIT_KEY_PREFIX = 'fastify-rate-limit-';

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`waitFor: condition not met in ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// ---------------------------------------------------------------------------
// Connection factory against the real broker (success criterion 4)
// ---------------------------------------------------------------------------

describe.skipIf(!redisReady)('redis connection factory (live)', () => {
  it('connects, logs the connection at info level, and closes cleanly', async () => {
    const lines: RecordedLog[] = [];
    const connection = createRedisConnection(REDIS_URL, makeRecordingLogger(lines));

    await new Promise<void>((resolve, reject) => {
      connection.once('ready', () => {
        resolve();
      });
      connection.once('error', reject);
    });

    const infoEvents = lines
      .filter((line) => line.level === 'info')
      .map((line) => line.obj['event']);
    expect(infoEvents).toContain('redis_connect');
    expect(infoEvents).toContain('redis_ready');

    await closeRedis(connection);
    expect(connection.status).toBe('end');
  });
});

// ---------------------------------------------------------------------------
// Worker stubs + graceful shutdown on the real broker (criterion 5)
// ---------------------------------------------------------------------------

describe.skipIf(!redisReady || !dbReady)('queue infrastructure (live)', () => {
  it(
    'OCR worker fails a job for a nonexistent document (requestId in logs), ' +
      'then shutdown drains workers before closing Redis',
    async () => {
      const lines: RecordedLog[] = [];
      const infra = startQueueInfrastructure(REDIS_URL, makeRecordingLogger(lines), prisma);
      const ocrQueue = infra.registry.queues[QUEUE_NAMES.OCR_PROCESSING];

      const requestId = randomUUID();
      // attempts: 1 overrides the default 3 so the test does not sit through
      // the 2s/4s retry backoff; behavior per attempt is identical. The
      // document id does not exist, so the real 4.2 processor fails before
      // touching any state.
      await ocrQueue.add(
        'process',
        { documentId: 'doc_int_test', athleteId: 'ath_int_test', requestId },
        { attempts: 1 },
      );

      await waitFor(
        () =>
          lines.some(
            (line) => line.obj['event'] === 'job_failed' && line.obj['requestId'] === requestId,
          ),
        15_000,
      );

      const started = lines.find(
        (line) => line.obj['event'] === 'job_started' && line.obj['requestId'] === requestId,
      );
      expect(started, 'job start must be logged before the failure').toBeDefined();

      const failed = lines.find(
        (line) => line.obj['event'] === 'job_failed' && line.obj['requestId'] === requestId,
      );
      expect(failed?.level).toBe('error');
      expect(failed?.obj['queue']).toBe(QUEUE_NAMES.OCR_PROCESSING);
      expect((failed?.obj['error'] as { message: string }).message).toBe(
        'medical document not found',
      );

      // Leave no failed jobs behind on the shared broker.
      await ocrQueue.obliterate({ force: true });

      await infra.close();

      // The logged shutdown sequence proves the drain ordering: workers
      // first, Redis last (success criterion 5).
      const shutdownEvents = lines
        .map((line) => line.obj['event'])
        .filter(
          (event) =>
            event === 'queue_shutdown_started' ||
            event === 'queue_workers_drained' ||
            event === 'queue_shutdown_complete',
        );
      expect(shutdownEvents).toEqual([
        'queue_shutdown_started',
        'queue_workers_drained',
        'queue_shutdown_complete',
      ]);
      expect(infra.connection.status).toBe('end');
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Rate-limit counter persistence across restarts (criterion 6)
// ---------------------------------------------------------------------------

describe.skipIf(!redisReady || !dbReady)('rate limiting — Redis persistence (live)', () => {
  let inspector: Redis | null = null;

  afterAll(async () => {
    if (inspector !== null) {
      await closeRedis(inspector);
    }
  });

  it('a bucket exhausted on one server instance is still exhausted on the next', async () => {
    inspector = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

    // Clear leftover counters (60s TTL) so reruns within a minute are stable.
    const staleKeys = await inspector.keys(`${RATE_LIMIT_KEY_PREFIX}*`);
    if (staleKeys.length > 0) {
      await inspector.del(...staleKeys);
    }

    // Server #1: exhaust the public bucket (3/min) from 127.0.0.1.
    const first = await startServer({ public: 3 });
    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`${first.url}/trpc/sport.list`);
      expect(res.status, `request ${i} of 3 should pass`).not.toBe(429);
    }
    const limited = await fetch(`${first.url}/trpc/sport.list`);
    expect(limited.status).toBe(429);
    await first.close();

    // The counter lives in Redis, not in the dead process.
    const keys = await inspector.keys(`${RATE_LIMIT_KEY_PREFIX}public:ip:*`);
    expect(keys.length).toBeGreaterThan(0);
    const counter = Number(await inspector.get(keys[0] ?? ''));
    expect(counter).toBeGreaterThanOrEqual(4);

    // Server #2 (fresh process state): the very first request is already
    // rate limited — with the Sprint 3 in-memory store this would be 200.
    const second = await startServer({ public: 3 });
    const afterRestart = await fetch(`${second.url}/trpc/sport.list`);
    expect(afterRestart.status).toBe(429);
    await second.close();

    // Cleanup so later runs (and other suites) start from a clean window.
    const leftover = await inspector.keys(`${RATE_LIMIT_KEY_PREFIX}*`);
    if (leftover.length > 0) {
      await inspector.del(...leftover);
    }
  }, 30_000);
});
