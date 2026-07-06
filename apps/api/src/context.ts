import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { FastifyBaseLogger } from 'fastify';

import { getEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { verifyAuthToken } from './middleware/auth.js';

export interface Context {
  userId: string | null;
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
}

const env = getEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
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
    supabase,
    requestId: req.id,
    log: req.log,
  };
}
