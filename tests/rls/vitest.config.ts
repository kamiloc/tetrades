import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['./**/*.test.ts'],
    // RLS tests run against a real Supabase instance — no parallelism to
    // avoid rate-limiting the auth admin API or hitting connection limits.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // Allow generous timeout for setup (creating auth users + signing in).
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
