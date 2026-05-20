export { trpc } from './client.js';
export type { AppRouter } from './client.js';
export { ApiProvider } from './provider.js';

export {
  useAthleteProfile,
  useUpdateProfile,
  usePublicProfile,
  useSearchAthletes,
} from './hooks/athlete.js';

export {
  useAddAchievement,
  useListAchievements,
  useVerifyAchievement,
} from './hooks/achievement.js';

export {
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useRejectConnectionRequest,
  useConnections,
} from './hooks/connection.js';

export { useQueryClient } from '@tanstack/react-query';
