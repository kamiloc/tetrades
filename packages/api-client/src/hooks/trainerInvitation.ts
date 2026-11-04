import { trpc } from '../client.js';

// Invitee side of trainer provisioning (ADR-017): invitations addressed to
// the caller's confirmed email.
export const useMyTrainerInvitations = () => trpc.trainerInvitation.listMine.useQuery();

export const useAcceptTrainerInvitation = () => {
  const utils = trpc.useUtils();
  return trpc.trainerInvitation.accept.useMutation({
    onSuccess: () => utils.trainerInvitation.listMine.invalidate(),
  });
};

export const useDeclineTrainerInvitation = () => {
  const utils = trpc.useUtils();
  return trpc.trainerInvitation.decline.useMutation({
    onSuccess: () => utils.trainerInvitation.listMine.invalidate(),
  });
};
