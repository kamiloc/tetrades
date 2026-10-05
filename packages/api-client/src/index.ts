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
  useMyPublicProfile,
  useUpdatePublicProfile,
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

export {
  useInviteAthleteToClub,
  useRespondToClubInvitation,
  useLeaveClub,
  useMyClubMemberships,
  useClubRoster,
} from './hooks/club';

export {
  useMetricDefinitions,
  useReportMetricEntry,
  useMetricEntries,
  useMetricSummaries,
} from './hooks/metric';

export { useMyVisibilitySettings, useUpdateVisibilitySettings } from './hooks/visibility';

export { useRegisterDeviceToken, useRemoveDeviceToken } from './hooks/notification';

export { useQueryClient } from '@tanstack/react-query';
