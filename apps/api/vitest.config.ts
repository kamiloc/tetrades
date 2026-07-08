import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests (src/__tests__/integration/) share one hosted
    // Postgres pool and the Supabase auth API; running files sequentially
    // keeps connection counts and auth-endpoint traffic predictable.
    fileParallelism: false,
    // Integration fixtures create real Supabase auth users over the network.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
