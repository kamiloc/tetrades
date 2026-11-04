import type {
  ListAdminClubsInput,
  ListClubTrainerInvitationsInput,
  ListClubTrainersInput,
} from '@packages/validators';

import { trpc } from '../client.js';

// Platform admin (ADR-017). Every procedure re-checks the ADMIN role on the
// server; these hooks only shape the calls and keep the caches fresh.

// FORBIDDEN for non-admins; the web portal uses it to gate admin pages.
export const useAdminWhoAmI = () => trpc.admin.whoAmI.useQuery(undefined, { retry: false });

export const useAdminClubs = (input: Partial<ListAdminClubsInput> = {}) =>
  trpc.admin.listClubs.useQuery(input);

export const useAdminClub = (clubId: string) => trpc.admin.getClub.useQuery({ clubId });

export const useAdminClubTrainers = (
  input: Pick<ListClubTrainersInput, 'clubId'> & Partial<ListClubTrainersInput>,
) => trpc.admin.listClubTrainers.useQuery(input);

export const useAdminClubTrainerInvitations = (
  input: Pick<ListClubTrainerInvitationsInput, 'clubId'> & Partial<ListClubTrainerInvitationsInput>,
) => trpc.admin.listClubTrainerInvitations.useQuery(input);

export const useCreateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.createClub.useMutation({
    onSuccess: () => utils.admin.listClubs.invalidate(),
  });
};

export const useUpdateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.updateClub.useMutation({
    onSuccess: (_club, { clubId }) =>
      Promise.all([utils.admin.listClubs.invalidate(), utils.admin.getClub.invalidate({ clubId })]),
  });
};

// Deactivation closes pending trainer invitations too.
export const useDeactivateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.deactivateClub.useMutation({
    onSuccess: (_result, { clubId }) =>
      Promise.all([
        utils.admin.listClubs.invalidate(),
        utils.admin.getClub.invalidate({ clubId }),
        utils.admin.listClubTrainerInvitations.invalidate({ clubId }),
      ]),
  });
};

export const useReactivateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.reactivateClub.useMutation({
    onSuccess: (_club, { clubId }) =>
      Promise.all([utils.admin.listClubs.invalidate(), utils.admin.getClub.invalidate({ clubId })]),
  });
};

export const useInviteTrainer = () => {
  const utils = trpc.useUtils();
  return trpc.admin.inviteTrainer.useMutation({
    onSuccess: (_invitation, { clubId }) =>
      utils.admin.listClubTrainerInvitations.invalidate({ clubId }),
  });
};

export const useRevokeTrainerInvitation = () => {
  const utils = trpc.useUtils();
  return trpc.admin.revokeTrainerInvitation.useMutation({
    onSuccess: () => utils.admin.listClubTrainerInvitations.invalidate(),
  });
};

// Revoking changes the club's active trainer count as well.
export const useRevokeTrainer = () => {
  const utils = trpc.useUtils();
  return trpc.admin.revokeTrainer.useMutation({
    onSuccess: () =>
      Promise.all([
        utils.admin.listClubTrainers.invalidate(),
        utils.admin.listClubs.invalidate(),
        utils.admin.getClub.invalidate(),
      ]),
  });
};
