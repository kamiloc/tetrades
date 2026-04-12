import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok' } as const;
});

const start = async () => {
  const port = Number(process.env['PORT']) || 3001;
  await server.listen({ port, host: '0.0.0.0' });
};

start().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});

export type { server };
