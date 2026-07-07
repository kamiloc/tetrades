import { buildServer } from './app.js';
import { getEnv } from './env.js';

const start = async () => {
  const env = getEnv();
  const server = await buildServer();

  const port = env.API_PORT ?? 3001;
  await server.listen({ port, host: '0.0.0.0' });
  server.log.info(`API server running on port ${port}`);
};

start().catch((err: unknown) => {
  // The server may have failed before its logger existed — console is the
  // only reliable sink for a fatal boot error.
  console.error(err);
  process.exit(1);
});
