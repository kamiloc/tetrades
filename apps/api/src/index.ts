import cors from '@fastify/cors';
import { initCryptoAudit } from '@packages/crypto';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createContext } from './context.js';
import { getEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { buildLoggerOptions, genReqId, registerRequestLogging } from './middleware/logging.js';
import { registerRateLimiting } from './middleware/rateLimit.js';
import { appRouter, type AppRouter } from './router/index.js';
import { createDecryptionAuditEmitter } from './services/audit.js';

const env = getEnv();
const server = Fastify({
  logger: buildLoggerOptions(env.NODE_ENV),
  genReqId,
  // Log lines bind the request ID as `requestId` (not Pino's default `reqId`)
  // so every line matches the task 3.8 log schema.
  requestIdLogLabel: 'requestId',
  // The summary line from registerRequestLogging replaces Fastify's default
  // "incoming request"/"request completed" pair.
  disableRequestLogging: true,
});

// Register the audit emitter before any request handling begins.
// decryptPII() will throw if this is not called first.
initCryptoAudit(createDecryptionAuditEmitter({ prisma, logger: server.log }));

const start = async () => {
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

  const port = env.API_PORT ?? 3001;
  await server.listen({ port, host: '0.0.0.0' });
  server.log.info(`API server running on port ${port}`);
};

start().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});
