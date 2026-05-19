// Sprint 3 will merge sub-routers here (athlete, medical, achievement, connection, storage).
// This placeholder keeps the server compilable during Sprint 2.
import { router } from '../trpc.js';

export const appRouter = router({});

export type AppRouter = typeof appRouter;
