import { router } from '../trpc.js';

import { achievementRouter } from './achievement.js';
import { athleteRouter } from './athlete.js';
import { connectionRouter } from './connection.js';
import { medicalRouter } from './medical.js';
import { sportRouter } from './sport.js';
import { storageRouter } from './storage.js';

export const appRouter = router({
  athlete: athleteRouter,
  medical: medicalRouter,
  achievement: achievementRouter,
  connection: connectionRouter,
  storage: storageRouter,
  sport: sportRouter,
});

export type AppRouter = typeof appRouter;
