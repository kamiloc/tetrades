/**
 * ioredis connection factory for BullMQ and Redis-backed rate limiting.
 *
 * One connection per server instance: apps/api's buildServer() creates it
 * and shares it between the @fastify/rate-limit store, every Queue in the
 * registry, and every Worker. BullMQ internally duplicate()s the connection
 * where it needs dedicated blocking sockets (Workers), so a single
 * factory-produced client is the correct amount of sharing.
 *
 * Upstash notes:
 *   - TLS is mandatory; the rediss:// scheme turns it on in ioredis, so no
 *     explicit `tls` option is needed here.
 *   - BullMQ requires `maxRetriesPerRequest: null` (commands queue while the
 *     connection is down instead of failing after N retries). This also
 *     applies to rate-limit INCR calls: while Redis is unreachable they wait
 *     for the reconnect instead of erroring requests into 500s.
 *   - `enableReadyCheck: false` per Upstash guidance (their proxy does not
 *     support the check reliably).
 *
 * NEVER log the connection URL or any error object that could embed it —
 * the URL carries the Upstash token (L3-RESTRICTED). Only event names,
 * error names/messages, and retry metadata are logged.
 */
import { Redis } from 'ioredis';

import type { QueueLogger } from './types.js';

/** Reconnection backoff: 1s, 2s, 4s, ... capped at 30s. Never gives up. */
export function reconnectBackoffMs(retryAttempt: number): number {
  return Math.min(1000 * 2 ** (retryAttempt - 1), 30_000);
}

export interface CreateRedisConnectionOptions {
  /**
   * Do not dial until the first command is issued. Used by unit tests to
   * inspect the configured client without a live Redis. Production callers
   * omit this so the connect/ready log lines appear at boot.
   */
  lazyConnect?: boolean;
}

/**
 * Create the shared ioredis connection. The caller owns its lifecycle and
 * must hand it to closeRedis() during graceful shutdown — after all BullMQ
 * workers have drained, never before.
 */
export function createRedisConnection(
  url: string,
  logger: QueueLogger,
  options: CreateRedisConnectionOptions = {},
): Redis {
  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: reconnectBackoffMs,
    ...(options.lazyConnect === true ? { lazyConnect: true } : {}),
  });

  connection.on('connect', () => {
    logger.info({ event: 'redis_connect' }, 'redis connection established');
  });
  connection.on('ready', () => {
    logger.info({ event: 'redis_ready' }, 'redis connection ready');
  });
  connection.on('close', () => {
    logger.warn({ event: 'redis_close' }, 'redis connection closed');
  });
  connection.on('reconnecting', (delayMs: number) => {
    logger.warn({ event: 'redis_reconnecting', delayMs }, 'redis reconnecting');
  });
  connection.on('error', (err: Error) => {
    // err.message for ioredis connection errors never contains the URL.
    logger.error(
      { event: 'redis_error', error: { name: err.name, message: err.message } },
      'redis connection error',
    );
  });

  return connection;
}

/**
 * Gracefully close a connection from createRedisConnection(). quit() flushes
 * pending writes; if the socket is already gone (or Redis is unreachable and
 * quit cannot be delivered), fall back to a hard disconnect so shutdown
 * never hangs on a dead connection. Resolves only once the client reaches
 * 'end' — quit()'s reply arrives before the socket actually closes.
 */
export async function closeRedis(connection: Redis): Promise<void> {
  if (connection.status === 'end') return;
  if (connection.status === 'wait') {
    // lazyConnect client that never dialed — nothing to flush.
    connection.disconnect();
    return;
  }

  const ended = new Promise<void>((resolve) => {
    connection.once('end', resolve);
  });
  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
  await ended;
}
