/**
 * Vitest setup file: loads real environment configuration for the RLS suite.
 *
 * Mirrors apps/api's integration helper. Sources, in precedence order
 * (earlier wins — loadEnvFile never overrides an already-set variable):
 *   1. Real shell environment (CI-provided secrets)
 *   2. <repo root>/.env
 *   3. apps/api/.env
 *
 * Fails fast with the names (never the values) of missing variables, instead
 * of the opaque "supabaseUrl is required" from supabase-js.
 */
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

for (const envFile of [path.join(REPO_ROOT, '.env'), path.join(REPO_ROOT, 'apps/api/.env')]) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // Missing .env file is fine — CI provides everything via the shell env.
  }
}

/** Real service-role keys are hundreds of characters; this filters placeholders like 'eyJ...'. */
const MIN_SERVICE_ROLE_KEY_LENGTH = 40;

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
  (name) => (process.env[name] ?? '') === '',
);
const placeholderKey =
  !missing.includes('SUPABASE_SERVICE_ROLE_KEY') &&
  (process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '').length < MIN_SERVICE_ROLE_KEY_LENGTH;

if (missing.length > 0 || placeholderKey) {
  throw new Error(
    'RLS tests need a real Supabase environment. ' +
      (missing.length > 0 ? `Missing: ${missing.join(', ')}. ` : '') +
      (placeholderKey ? 'SUPABASE_SERVICE_ROLE_KEY looks like a placeholder. ' : '') +
      'Set them in the shell, <repo>/.env, or apps/api/.env.',
  );
}
