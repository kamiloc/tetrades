import { randomUUID } from 'node:crypto';

import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import { prisma } from './lib/prisma.js';
import { verifyAuthToken } from './middleware/auth.js';

export async function createContext({ req }: CreateFastifyContextOptions) {
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
    supabaseUserId: authResult.supabaseUserId,
    requestId,
    req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
