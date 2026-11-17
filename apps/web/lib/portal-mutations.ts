import {
  trpc,
  useAcceptTrainerInvitation,
  useCreateClub,
  useDeactivateClub,
  useDeclineTrainerInvitation,
  useInviteTrainer,
  useReactivateClub,
  useRevokeTrainer,
  useRevokeTrainerInvitation,
  useUpdateClub,
} from '@packages/api-client';

// Portal mutations, with the refreshes from design D7. The api-client hooks
// already invalidate most keys; the extra invalidations here cover what they
// don't, so every affected list, detail and count updates without a reload.
//
// | Mutation                           | Invalidated                                                  |
// | createClub                         | admin.listClubs                                              |
// | updateClub                         | admin.getClub(id), admin.listClubs                           |
// | deactivateClub, reactivateClub     | admin.getClub(id), admin.listClubs, listClubTrainerInvitations(id) |
// | inviteTrainer, revokeTrainerInv.   | admin.listClubTrainerInvitations(id)                         |
// | revokeTrainer                      | admin.listClubTrainers(id), admin.listClubs, admin.getClub(id) |
// | trainerInvitation.accept, decline  | trainerInvitation.listMine                                   |
//
// Every admin mutation above also invalidates admin.getOverview,
// admin.listActions and admin.listTrainers (add-web-admin-insights D4).

export const useCreateClubMutation = useCreateClub;
export const useUpdateClubMutation = useUpdateClub;
export const useDeactivateClubMutation = useDeactivateClub;
export const useInviteTrainerMutation = useInviteTrainer;
export const useRevokeTrainerInvitationMutation = useRevokeTrainerInvitation;
export const useRevokeTrainerMutation = useRevokeTrainer;
export const useAcceptTrainerInvitationMutation = useAcceptTrainerInvitation;
export const useDeclineTrainerInvitationMutation = useDeclineTrainerInvitation;

/** Reactivation also refreshes the club's invitations (the hook doesn't). */
export function useReactivateClubMutation() {
  const utils = trpc.useUtils();
  const mutation = useReactivateClub();
  return {
    ...mutation,
    mutateAsync: async (input: { clubId: string }) => {
      const club = await mutation.mutateAsync(input);
      await utils.admin.listClubTrainerInvitations.invalidate({ clubId: input.clubId });
      return club;
    },
  };
}
