import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { FastifyBaseLogger } from 'fastify';

import { getEnv } from './env.js';
import { disabledJobEnqueuer, type JobEnqueuer } from './lib/jobs.js';
import { prisma } from './lib/prisma.js';
import { verifyAuthToken } from './middleware/auth.js';

export interface Context {
  userId: string | null;
  /**
   * The caller's CONFIRMED email, trimmed and lowercased; null without a
   * session or when Supabase has not confirmed the address (ADR-017 D2).
   * L1-INTERNAL: only the trainer-invitation procedures read it. Never log it
   * and never include it in an error message or a response.
   */
  userEmail: string | null;
  supabase: SupabaseClient;
  prisma: typeof prisma;
  /**
   * Fastify's request ID (UUID v4, generated at ingress by genReqId in
   * middleware/logging.ts). Propagated into decryptPII audit contexts and
   * BullMQ job payloads for end-to-end correlation.
   */
  requestId: string;
  /**
   * Request-scoped Pino child logger — every line it emits already carries
   * the requestId binding. Procedures log through this, never through a
   * module-level logger, so correlation is automatic.
   */
  log: FastifyBaseLogger;
  /** Background-job port; always enqueue AFTER persisting the triggering row. */
  jobs: JobEnqueuer;
}

const env = getEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/** buildServer() binds the job port; tests may inject their own. */
export function createContextFactory(
  jobs: JobEnqueuer,
): (opts: CreateFastifyContextOptions) => Promise<Context> {
  return async (opts) => ({ ...(await createBaseContext(opts)), jobs });
}

/** Context without background jobs (enqueue rejects). */
export const createContext = createContextFactory(disabledJobEnqueuer);

async function createBaseContext({
  req,
}: CreateFastifyContextOptions): Promise<Omit<Context, 'jobs'>> {
  // The rate-limit onRequest hook (middleware/rateLimit.ts) verifies the JWT
  // before routing; reuse its result to avoid a second Supabase call.
  const authResult =
    req.authResult ?? (await verifyAuthToken(req.headers['authorization']));

  if (authResult.authenticated) {
    req.log.debug('auth verified');
  } else {
    req.log.debug(
      { code: authResult.errorCode ?? 'no_token' },
      'auth not present or invalid',
    );
  }

  return {
    prisma,
    userId: authResult.userId,
    userEmail: normalizeEmail(authResult.authenticated ? authResult.email : null),
    supabase,
    requestId: req.id,
    log: req.log,
  };
}

/** Trimmed and lowercased, so it compares equal to stored invitation emails. */
export function normalizeEmail(email: string | null): string | null {
  if (email === null) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
