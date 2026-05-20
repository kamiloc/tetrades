import cors from '@fastify/cors';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createContext } from './context.js';
import { getEnv } from './env.js';
import { appRouter, type AppRouter } from './router/index.js';

const env = getEnv();
const server = Fastify({ logger: true });

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
