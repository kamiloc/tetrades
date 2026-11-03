import {
  clubMembershipMutationOutput,
  clubMembershipOwnerListOutput,
  clubRosterListOutput,
  inviteAthleteToClubInput,
  leaveClubInput,
  listClubRosterInput,
  listMyClubMembershipsInput,
  respondToClubInvitationInput,
} from '@packages/validators';

import {
  inviteAthlete,
  leaveClub,
  listMyMemberships,
  listRoster,
  respondToInvitation,
} from '../services/membership.js';
import { requireViewer, requireViewerAthlete } from '../services/viewer.js';
import { protectedProcedure, router, trainerProcedure } from '../trpc.js';

// Memberships and the trainer roster. Clubs and trainer access are managed by
// platform admins through the admin router (ADR-017).
export const clubRouter = router({
  inviteAthlete: trainerProcedure
    .input(inviteAthleteToClubInput)
    .output(clubMembershipMutationOutput)
    .mutation(({ ctx, input }) =>
      inviteAthlete(ctx.prisma, ctx.clubTrainer, input, {
        jobs: ctx.jobs,
        requestId: ctx.requestId,
        log: ctx.log,
      }),
    ),

  respondToInvitation: protectedProcedure
    .input(respondToClubInvitationInput)
    .output(clubMembershipMutationOutput)
    .mutation(async ({ ctx, input }) =>
      respondToInvitation(ctx.prisma, await requireViewer(ctx.prisma, ctx.userId), input),
    ),

  leave: protectedProcedure
    .input(leaveClubInput)
    .output(clubMembershipMutationOutput)
    .mutation(async ({ ctx, input }) =>
      leaveClub(ctx.prisma, await requireViewer(ctx.prisma, ctx.userId), input),
    ),

  listMyMemberships: protectedProcedure
    .input(listMyClubMembershipsInput)
    .output(clubMembershipOwnerListOutput)
    .query(async ({ ctx, input }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return listMyMemberships(ctx.prisma, athleteId, input);
    }),

  listRoster: trainerProcedure
    .input(listClubRosterInput)
    .output(clubRosterListOutput)
    .query(({ ctx, input }) => listRoster(ctx.prisma, ctx.clubTrainer, input)),
});
