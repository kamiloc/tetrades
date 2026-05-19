import cors from '@fastify/cors';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createContext } from './context.js';
import { appRouter, type AppRouter } from './router/index.js';

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
});

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
  },
} satisfies FastifyTRPCPluginOptions<AppRouter>);

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() } as const;
});

const start = async () => {
  const port = Number(process.env['API_PORT'] ?? process.env['PORT']) || 3001;
  await server.listen({ port, host: '0.0.0.0' });
};

start().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});

export type { AppRouter };
