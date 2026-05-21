import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '../../../apps/api/src/router/index.js';

export const trpc = createTRPCReact<AppRouter>();

export type { AppRouter };
