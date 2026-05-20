import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import { getEnv } from './env.js';
import { prisma } from './lib/prisma.js';
import { verifyAuthToken } from './middleware/auth.js';

export interface Context {
  userId: string | null;
  supabase: SupabaseClient;
  prisma: typeof prisma;
  requestId: string;
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
  const requestId =
    (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

  const authResult = await verifyAuthToken(req.headers['authorization']);

  if (authResult.authenticated) {
    req.log.info({ requestId, msg: 'auth verified' });
  } else {
    req.log.info({
      requestId,
      msg: 'auth not present or invalid',
      code: authResult.errorCode ?? 'no_token',
    });
  }

  return {
    prisma,
    userId: authResult.userId,
    supabase,
    requestId,
  };
}
