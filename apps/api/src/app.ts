/**
 * Fastify server factory — the single place the API server is assembled.
 *
 * index.ts calls this and listens; integration tests call it and listen on
 * an ephemeral port. Both paths run the identical stack: CORS, once-per-
 * request auth verification + tiered rate limiting (3.7), structured
 * logging (3.8), crypto audit emitter, and the tRPC router.
 */
import cors from '@fastify/cors';
import { initCryptoAudit } from '@packages/crypto';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyInstance } from 'fastify';

import { createContext } from './context.js';
import { getEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { buildLoggerOptions, genReqId, registerRequestLogging } from './middleware/logging.js';
import { registerRateLimiting } from './middleware/rateLimit.js';
import { appRouter, type AppRouter } from './router/index.js';
import { createDecryptionAuditEmitter } from './services/audit.js';

export interface BuildServerOptions {
  /**
   * Raise the log threshold without touching env-driven logger config.
   * Integration tests pass 'silent' so hundreds of request-summary lines
   * don't drown the test reporter. Never set in production code paths.
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const env = getEnv();

  const loggerOptions = buildLoggerOptions(env.NODE_ENV);
  const server = Fastify({
    logger: options.logLevel
      ? { ...loggerOptions, level: options.logLevel }
      : loggerOptions,
    genReqId,
    // Log lines bind the request ID as `requestId` (not Pino's default
    // `reqId`) so every line matches the task 3.8 log schema.
    requestIdLogLabel: 'requestId',
    // The summary line from registerRequestLogging replaces Fastify's
    // default "incoming request"/"request completed" pair.
    disableRequestLogging: true,
  });

  // Register the audit emitter before any request handling begins.
  // decryptPII() will throw if this is not called first.
  initCryptoAudit(createDecryptionAuditEmitter({ prisma, logger: server.log }));

  await server.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  // Rate limiting must be registered before the tRPC plugin so the limiter
  // (and its once-per-request auth verification) runs ahead of procedures.
  await registerRateLimiting(server);
  registerRequestLogging(server);

  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>);

  return server;
}
