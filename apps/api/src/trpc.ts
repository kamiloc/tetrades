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
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires a valid Supabase JWT.
 *
 * Throws UNAUTHORIZED if ctx.userId is null (unauthenticated request).
 * After this middleware passes, ctx.userId is narrowed from `string | null`
 * to `string`, so procedures built on protectedProcedure never null-check it.
 */
export const protectedProcedure = t.procedure.use(
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
