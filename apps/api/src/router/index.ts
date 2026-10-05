import { router } from '../trpc.js';

import { achievementRouter } from './achievement.js';
import { athleteRouter } from './athlete.js';
import { clubRouter } from './club.js';
import { connectionRouter } from './connection.js';
import { metricRouter } from './metric.js';
import { notificationRouter } from './notification.js';
import { sportRouter } from './sport.js';
import { storageRouter } from './storage.js';
import { visibilityRouter } from './visibility.js';

export const appRouter = router({
  athlete: athleteRouter,
  achievement: achievementRouter,
  connection: connectionRouter,
  storage: storageRouter,
  sport: sportRouter,
  club: clubRouter,
  metric: metricRouter,
  visibility: visibilityRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
