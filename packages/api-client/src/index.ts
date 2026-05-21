export { trpc } from './client';
export type { AppRouter } from './client';
export { ApiProvider } from './provider';

export {
  useAthleteProfile,
  useUpdateProfile,
  usePublicProfile,
  useSearchAthletes,
  useMyAthlete,
  useOnboardingState,
  useBootstrapAthlete,
} from './hooks/athlete';

export { useSports } from './hooks/sport';

export {
  useAddAchievement,
  useListAchievements,
  useVerifyAchievement,
} from './hooks/achievement';

export {
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useRejectConnectionRequest,
  useConnections,
} from './hooks/connection';

export { useQueryClient } from '@tanstack/react-query';
