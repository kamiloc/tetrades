import { buildServer } from './app.js';
import { getEnv } from './env.js';

const start = async () => {
  const env = getEnv();
  const server = await buildServer();

  // Graceful shutdown (task 4.1): server.close() stops the HTTP listener,
  // waits for in-flight requests, then runs the onClose hooks — including
  // the queue shutdown sequence, which drains active BullMQ jobs before the
  // Redis connection is closed. `once` so a second signal force-kills.
  const shutdown = (signal: 'SIGTERM' | 'SIGINT'): void => {
    server.log.info({ signal }, 'shutdown signal received, draining');
    server.close().then(
      () => {
        server.log.info('shutdown complete');
        // No process.exit() here: it would race pino's async flush and drop
        // the shutdown log lines. With workers, Redis, and Prisma closed the
        // event loop empties and the process exits on its own; the unref'd
        // timer only fires if a stray handle keeps the loop alive.
        setTimeout(() => process.exit(0), 5000).unref();
      },
      (err: unknown) => {
        server.log.error(
          { error: err instanceof Error ? { name: err.name, message: err.message } : {} },
          'shutdown failed',
        );
        process.exit(1);
      },
    );
  };
  process.once('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    shutdown('SIGINT');
  });

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
