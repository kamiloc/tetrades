import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

import type { Context } from './context.js';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    // Return the standard shape without exposing internal details to clients.
    return shape;
  },
});

export const router = t.router;

/**
 * Procedure entry/exit logging at `debug` — invisible in production, where
 * the logger level is `info` (middleware/logging.ts). Logs the procedure
 * path and outcome only; never input or output values, which can contain
 * L2 data on medical/private-profile procedures.
 */
const procedureLogging = t.middleware(async ({ ctx, path, type, next }) => {
  ctx.log.debug({ procedure: path, type }, 'procedure start');
  const startedAt = Date.now();

  const result = await next();

  ctx.log.debug(
    { procedure: path, type, durationMs: Date.now() - startedAt, ok: result.ok },
    'procedure end',
  );
  return result;
});

export const publicProcedure = t.procedure.use(procedureLogging);

/**
 * Protected procedure — requires a valid Supabase JWT.
 *
 * Throws UNAUTHORIZED if ctx.userId is null (unauthenticated request).
 * After this middleware passes, ctx.userId is narrowed from `string | null`
 * to `string`, so procedures built on protectedProcedure never null-check it.
 */
export const protectedProcedure = publicProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    });
  }),
);
