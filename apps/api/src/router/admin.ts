import {
  adminClubIdInput,
  adminClubListOutput,
  adminClubOutput,
  adminClubTrainerListOutput,
  adminTrainerInvitationListOutput,
  adminWhoAmIOutput,
  clubTrainerIdInput,
  createClubInput,
  deactivateClubOutput,
  inviteTrainerInput,
  inviteTrainerOutput,
  listAdminClubsInput,
  listClubTrainerInvitationsInput,
  listClubTrainersInput,
  revokeClubTrainerOutput,
  trainerInvitationIdInput,
  trainerInvitationMutationOutput,
  updateClubInput,
} from '@packages/validators';

import {
  createClub,
  deactivateClub,
  getClub,
  listClubs,
  reactivateClub,
  updateClub,
} from '../services/adminClubs.js';
import {
  inviteTrainer,
  listClubTrainerInvitations,
  listClubTrainers,
  revokeTrainer,
  revokeTrainerInvitation,
} from '../services/trainerInvitations.js';
import { adminProcedure, router } from '../trpc.js';

/**
 * Platform admin surface (ADR-017, design D9): clubs and trainer access only.
 * Every procedure is adminProcedure (role re-read on every call). There is no
 * procedure that deletes a club, reads athlete data, or writes an account's
 * role or a legal hold.
 */
export const adminRouter = router({
  whoAmI: adminProcedure.output(adminWhoAmIOutput).query(() => ({ isAdmin: true as const })),

  createClub: adminProcedure
    .input(createClubInput)
    .output(adminClubOutput)
    .mutation(({ ctx, input }) => createClub(ctx.prisma, ctx, input)),

  // `.strict()` input: a `slug` key is BAD_REQUEST, so the slug never changes.
  updateClub: adminProcedure
    .input(updateClubInput)
    .output(adminClubOutput)
    .mutation(({ ctx, input }) => updateClub(ctx.prisma, ctx, input)),

  listClubs: adminProcedure
    .input(listAdminClubsInput)
    .output(adminClubListOutput)
    .query(({ ctx, input }) => listClubs(ctx.prisma, input)),

  getClub: adminProcedure
    .input(adminClubIdInput)
    .output(adminClubOutput)
    .query(({ ctx, input }) => getClub(ctx.prisma, input.clubId)),

  deactivateClub: adminProcedure
    .input(adminClubIdInput)
    .output(deactivateClubOutput)
    .mutation(({ ctx, input }) => deactivateClub(ctx.prisma, ctx, input.clubId)),

  reactivateClub: adminProcedure
    .input(adminClubIdInput)
    .output(adminClubOutput)
    .mutation(({ ctx, input }) => reactivateClub(ctx.prisma, ctx, input.clubId)),

  listClubTrainers: adminProcedure
    .input(listClubTrainersInput)
    .output(adminClubTrainerListOutput)
    .query(({ ctx, input }) => listClubTrainers(ctx.prisma, input)),

  listClubTrainerInvitations: adminProcedure
    .input(listClubTrainerInvitationsInput)
    .output(adminTrainerInvitationListOutput)
    .query(({ ctx, input }) => listClubTrainerInvitations(ctx.prisma, input)),

  inviteTrainer: adminProcedure
    .input(inviteTrainerInput)
    .output(inviteTrainerOutput)
    .mutation(({ ctx, input }) => inviteTrainer(ctx.prisma, ctx, input)),

  revokeTrainerInvitation: adminProcedure
    .input(trainerInvitationIdInput)
    .output(trainerInvitationMutationOutput)
    .mutation(({ ctx, input }) => revokeTrainerInvitation(ctx.prisma, ctx, input.invitationId)),

  revokeTrainer: adminProcedure
    .input(clubTrainerIdInput)
    .output(revokeClubTrainerOutput)
    .mutation(({ ctx, input }) => revokeTrainer(ctx.prisma, ctx, input.clubTrainerId)),
});
