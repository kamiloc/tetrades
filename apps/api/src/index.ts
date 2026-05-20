import cors from '@fastify/cors';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { initCryptoAudit } from '@packages/crypto';

import { createContext } from './context.js';
import { getEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { appRouter, type AppRouter } from './router/index.js';

const env = getEnv();
const server = Fastify({ logger: true });

// Register the audit emitter before any request handling begins.
// decryptPII() will throw if this is not called first.
initCryptoAudit(async (event) => {
  const actor = await prisma.userAccount.findUnique({
    where: { supabaseUserId: event.actorId },
    select: { id: true, athlete: { select: { id: true } } },
  });

  if (!actor?.athlete) return;

  await prisma.auditEvent.create({
    data: {
      actorUserAccountId: actor.id,
      athleteId: actor.athlete.id,
      eventType: event.action,
      targetType: event.target.table,
      targetId: event.target.recordId,
      purposeCode: event.purpose,
      requestId: event.requestId,
      metadata: { field: event.target.field },
    },
  });
});

const start = async () => {
  await server.register(cors, {
    origin: env.CORS_ORIGIN,
  });

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
