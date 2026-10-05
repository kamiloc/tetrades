import type { ListClubRosterInput, ListMyClubMembershipsInput } from '@packages/validators';

import { trpc } from '../client.js';

// Trainer: invite an athlete to the trainer's club (PENDING_ATHLETE_CONFIRMATION).
export const useInviteAthleteToClub = () => trpc.club.inviteAthlete.useMutation();

// Athlete: accept (ACTIVE) or reject (REJECTED) a pending invitation.
export const useRespondToClubInvitation = () => trpc.club.respondToInvitation.useMutation();

// Athlete: end an ACTIVE membership (COMPLETED).
export const useLeaveClub = () => trpc.club.leave.useMutation();

export const useMyClubMemberships = (input: Partial<ListMyClubMembershipsInput> = {}) =>
  trpc.club.listMyMemberships.useQuery(input);

// Trainer: ACTIVE members plus the invitations this trainer sent.
export const useClubRoster = (input: Pick<ListClubRosterInput, 'clubId'> & Partial<ListClubRosterInput>) =>
  trpc.club.listRoster.useQuery(input);
