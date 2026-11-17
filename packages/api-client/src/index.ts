export { trpc } from './client';
export type { AppRouter } from './client';
export { ApiProvider } from './provider';
export { getApiErrorCode } from './errors';

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
  useRequestCertification,
  useWithdrawCertification,
  useMyCertificationRequests,
  usePendingCertifications,
  useDecideCertification,
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
  useMyTrainerClubs,
  useRosterAthlete,
  useFindAthleteToInvite,
} from './hooks/club';
export type { FindAthleteToInviteHookInput } from './hooks/club';

export {
  useMetricDefinitions,
  useReportMetricEntry,
  useMetricEntries,
  useMetricSummaries,
} from './hooks/metric';

export { useMyVisibilitySettings, useUpdateVisibilitySettings } from './hooks/visibility';

export {
  useAdminWhoAmI,
  useAdminClubs,
  useAdminClub,
  useAdminClubTrainers,
  useAdminClubTrainerInvitations,
  useAdminOverview,
  useAdminTrainers,
  useAdminActions,
  useCreateClub,
  useUpdateClub,
  useDeactivateClub,
  useReactivateClub,
  useInviteTrainer,
  useRevokeTrainerInvitation,
  useRevokeTrainer,
} from './hooks/admin';

export {
  useMyTrainerInvitations,
  useAcceptTrainerInvitation,
  useDeclineTrainerInvitation,
} from './hooks/trainerInvitation';

export { useRegisterDeviceToken, useRemoveDeviceToken } from './hooks/notification';

export { useQueryClient } from '@tanstack/react-query';

export {
  useConfirmProfilePhotoUpload,
  useProfilePhotoUploadUrl,
  useProfilePhotoViewUrl,
} from './hooks/storage';
