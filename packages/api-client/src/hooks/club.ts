import type {
  FindAthleteToInviteInput,
  GetRosterAthleteInput,
  ListClubRosterInput,
  ListMyClubMembershipsInput,
  ListMyTrainerClubsInput,
} from '@packages/validators';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

import { trpc } from '../client.js';

// Trainer: invite an athlete to the trainer's club (PENDING_ATHLETE_CONFIRMATION).
// Refreshes the roster and the invite lookup's relation states.
export const useInviteAthleteToClub = () => {
  const utils = trpc.useUtils();
  return trpc.club.inviteAthlete.useMutation({
    onSuccess: (_membership, { clubId }) =>
      Promise.all([
        utils.club.listRoster.invalidate({ clubId }),
        utils.club.findAthleteToInvite.invalidate(),
      ]),
  });
};

// Athlete: accept (ACTIVE) or reject (REJECTED) a pending invitation.
export const useRespondToClubInvitation = () => trpc.club.respondToInvitation.useMutation();

// Athlete: end an ACTIVE membership (COMPLETED).
export const useLeaveClub = () => trpc.club.leave.useMutation();

export const useMyClubMemberships = (input: Partial<ListMyClubMembershipsInput> = {}) =>
  trpc.club.listMyMemberships.useQuery(input);

// Trainer: ACTIVE members plus the invitations this trainer sent.
export const useClubRoster = (input: Pick<ListClubRosterInput, 'clubId'> & Partial<ListClubRosterInput>) =>
  trpc.club.listRoster.useQuery(input);

// The caller's own trainer clubs; empty for non-trainers.
export const useMyTrainerClubs = (input: Partial<ListMyTrainerClubsInput> = {}) =>
  trpc.club.listMyTrainerClubs.useQuery(input);

// Trainer: one roster athlete (NOT_FOUND when not on the roster).
export const useRosterAthlete = (input: GetRosterAthleteInput) =>
  trpc.club.getRosterAthlete.useQuery(input);

/** Invite lookup input without the cursor, which the hook manages. */
export type FindAthleteToInviteHookInput =
  | (Omit<Extract<FindAthleteToInviteInput, { by: 'name' }>, 'cursor' | 'take'> & { take?: number })
  | Extract<FindAthleteToInviteInput, { by: 'slug' }>;

/**
 * Trainer: invite lookup as an infinite query ("Load more" for name search;
 * a slug lookup is always one page). tRPC's own useInfiniteQuery can't type a
 * discriminated-union input, so this uses TanStack directly with tRPC's
 * infinite query key: `utils.club.findAthleteToInvite.invalidate()` matches it.
 */
export const useFindAthleteToInvite = (
  input: FindAthleteToInviteHookInput,
  options: { enabled?: boolean } = {},
) => {
  const utils = trpc.useUtils();
  return useInfiniteQuery({
    queryKey: getQueryKey(trpc.club.findAthleteToInvite, input, 'infinite'),
    queryFn: ({ pageParam }) =>
      utils.client.club.findAthleteToInvite.query(
        input.by === 'name' && pageParam !== undefined ? { ...input, cursor: pageParam } : input,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
  });
};
