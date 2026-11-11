import type {
  ListAdminActionsInput,
  ListAdminClubsInput,
  ListAdminTrainersInput,
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

// Platform overview counts; refreshed by every admin mutation (design D4) and
// considered fresh for a minute in between.
export const useAdminOverview = () =>
  trpc.admin.getOverview.useQuery(undefined, { staleTime: 60_000 });

// Cross-club trainer directory, newest first, with Load more.
export const useAdminTrainers = (input: Omit<Partial<ListAdminTrainersInput>, 'cursor'> = {}) =>
  trpc.admin.listTrainers.useInfiniteQuery(input, {
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

// Admin action log, newest first, with Load more.
export const useAdminActions = (input: Omit<Partial<ListAdminActionsInput>, 'cursor'> = {}) =>
  trpc.admin.listActions.useInfiniteQuery(input, {
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

type AdminUtils = ReturnType<typeof trpc.useUtils>;

// Every admin write changes what the insight pages show: the overview counts,
// the activity log, and the directory (club name, access or revocation).
const invalidateInsights = (utils: AdminUtils) =>
  Promise.all([
    utils.admin.getOverview.invalidate(),
    utils.admin.listActions.invalidate(),
    utils.admin.listTrainers.invalidate(),
  ]);

export const useCreateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.createClub.useMutation({
    onSuccess: () => Promise.all([utils.admin.listClubs.invalidate(), invalidateInsights(utils)]),
  });
};

export const useUpdateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.updateClub.useMutation({
    onSuccess: (_club, { clubId }) =>
      Promise.all([
        utils.admin.listClubs.invalidate(),
        utils.admin.getClub.invalidate({ clubId }),
        invalidateInsights(utils),
      ]),
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
        invalidateInsights(utils),
      ]),
  });
};

export const useReactivateClub = () => {
  const utils = trpc.useUtils();
  return trpc.admin.reactivateClub.useMutation({
    onSuccess: (_club, { clubId }) =>
      Promise.all([
        utils.admin.listClubs.invalidate(),
        utils.admin.getClub.invalidate({ clubId }),
        invalidateInsights(utils),
      ]),
  });
};

export const useInviteTrainer = () => {
  const utils = trpc.useUtils();
  return trpc.admin.inviteTrainer.useMutation({
    onSuccess: (_invitation, { clubId }) =>
      Promise.all([
        utils.admin.listClubTrainerInvitations.invalidate({ clubId }),
        invalidateInsights(utils),
      ]),
  });
};

export const useRevokeTrainerInvitation = () => {
  const utils = trpc.useUtils();
  return trpc.admin.revokeTrainerInvitation.useMutation({
    onSuccess: () =>
      Promise.all([utils.admin.listClubTrainerInvitations.invalidate(), invalidateInsights(utils)]),
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
        invalidateInsights(utils),
      ]),
  });
};
