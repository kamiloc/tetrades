import { sportPublicListOutput } from '@packages/validators';

import { publicProcedure, router } from '../trpc.js';

export const sportRouter = router({
  /**
   * Public list of active sports. Powers the onboarding dropdown.
   * Sports are L0-PUBLIC, no auth required.
   */
  list: publicProcedure
    .output(sportPublicListOutput)
    .query(async ({ ctx }) => {
      return ctx.prisma.sport.findMany({
        where:   { isActive: true },
        orderBy: { name: 'asc' },
        select:  { id: true, name: true, category: true, isActive: true },
      });
    }),
});
