import { sportPublicOutput } from '@packages/validators';
import { z } from 'zod';

import { publicProcedure, router } from '../trpc.js';

export const sportRouter = router({
  /**
   * Public list of active sports. Powers the onboarding dropdown.
   * Sports are L0-PUBLIC, no auth required.
   */
  list: publicProcedure
    .output(z.array(sportPublicOutput))
    .query(async ({ ctx }) => {
      return ctx.prisma.sport.findMany({
        where:   { isActive: true },
        orderBy: { name: 'asc' },
        select:  { id: true, name: true, category: true, isActive: true },
      });
    }),
});
