/**
 * Side-effect module: loads real environment configuration for integration
 * tests. MUST be the first import (directly or via setup.js) of every
 * integration test file so it runs before any module that reads env at
 * import time (lib/prisma.js validates env in its module body).
 *
 * Sources, in precedence order (earlier wins — loadEnvFile never overrides
 * an already-set variable):
 *   1. Real shell environment (CI-provided secrets)
 *   2. <repo root>/.env
 *   3. apps/api/.env
 *
 * Per the task 3.9 test-database strategy, TEST_DATABASE_URL (when present)
 * replaces DATABASE_URL for the whole test process, pointing Prisma at the
 * dedicated test schema. Prisma reads DATABASE_URL from process.env
 * directly, so the override must happen here, not in getEnv().
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');

for (const envFile of [path.join(REPO_ROOT, '.env'), path.join(REPO_ROOT, 'apps/api/.env')]) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // Missing .env file is fine — CI provides everything via the shell env.
  }
}

if (process.env['TEST_DATABASE_URL'] !== undefined && process.env['TEST_DATABASE_URL'] !== '') {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
}

// Tests always run as NODE_ENV=test regardless of what .env declares:
// JSON logs (no pino-pretty transport) and no prod-only behavior.
process.env['NODE_ENV'] = 'test';

// Test-only fallbacks for env vars getEnv() requires but that are irrelevant
// to CI test runs. MASTER_ENCRYPTION_KEY only needs to be self-consistent
// within a single run — every encrypted row the suite creates is deleted in
// teardown, so a synthetic key never poisons shared data.
process.env['CORS_ORIGIN'] ??= 'http://localhost:3000';
process.env['MASTER_ENCRYPTION_KEY'] ??= 'ad'.repeat(32);

/** DATABASE_URL + Supabase URL/anon key present — server + Prisma tests can run. */
export const dbReady = Boolean(
  process.env['DATABASE_URL'] && process.env['SUPABASE_URL'] && process.env['SUPABASE_ANON_KEY'],
);

/**
 * A usable service-role key is also present — real Supabase auth users can
 * be created, so JWT-authenticated tests can run. The length guard filters
 * placeholder values (the local .env ships 'eyJ...'); real service-role
 * keys are hundreds of characters.
 */
export const authReady =
  dbReady && (process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '').length >= 40;

if (!authReady) {
  // Loud, once-per-process notice so a CI secrets misconfiguration is
  // visible instead of silently skipping the authenticated test groups.
  console.warn(
    '[integration] SUPABASE_SERVICE_ROLE_KEY missing or placeholder — ' +
      'JWT-authenticated test groups will be SKIPPED. DB-only groups ' +
      (dbReady ? 'will run.' : 'will also be skipped (no DATABASE_URL).'),
  );
}
