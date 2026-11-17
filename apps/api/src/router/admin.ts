import {
  adminActionListOutput,
  adminClubIdInput,
  adminClubListOutput,
  adminClubOutput,
  adminClubTrainerListOutput,
  adminOverviewOutput,
  adminTrainerDirectoryListOutput,
  adminTrainerInvitationListOutput,
  adminWhoAmIOutput,
  clubTrainerIdInput,
  createClubInput,
  deactivateClubOutput,
  inviteTrainerInput,
  inviteTrainerOutput,
  listAdminActionsInput,
  listAdminClubsInput,
  listAdminTrainersInput,
  listClubTrainerInvitationsInput,
  listClubTrainersInput,
  revokeClubTrainerOutput,
  trainerInvitationIdInput,
  trainerInvitationMutationOutput,
  updateClubInput,
} from '@packages/validators';

import { createSupabaseAdminDirectory } from '../lib/supabaseAdmin.js';
import {
  createClub,
  deactivateClub,
  getClub,
  listClubs,
  reactivateClub,
  updateClub,
} from '../services/adminClubs.js';
import {
  createCachedEmailLookup,
  getOverview,
  listActions,
  listTrainers,
  type AdminEmailLookup,
} from '../services/adminInsights.js';
import {
  inviteTrainer,
  listClubTrainerInvitations,
  listClubTrainers,
  revokeTrainer,
  revokeTrainerInvitation,
} from '../services/trainerInvitations.js';
import { adminProcedure, router } from '../trpc.js';

// Created on first use so routers load without the service-role key (tests,
// bare dev). One cached lookup per process (design D2).
let emailLookup: AdminEmailLookup | null = null;
const adminEmailLookup = (): AdminEmailLookup =>
  (emailLookup ??= createCachedEmailLookup(createSupabaseAdminDirectory()));

/**
 * Platform admin surface (ADR-017, design D9): clubs and trainer access only.
 * Every procedure is adminProcedure (role re-read on every call). There is no
 * procedure that deletes a club, reads athlete data, or writes an account's
 * role or a legal hold. The insight reads (getOverview, listTrainers,
 * listActions) are read-only and return no athlete data.
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

  // Six counts from one REPEATABLE READ snapshot; no athlete data.
  getOverview: adminProcedure
    .output(adminOverviewOutput)
    .query(({ ctx }) => getOverview(ctx.prisma)),

  listTrainers: adminProcedure
    .input(listAdminTrainersInput)
    .output(adminTrainerDirectoryListOutput)
    .query(({ ctx, input }) => listTrainers(ctx.prisma, input)),

  // Reads the admin action log; resolves other admins' emails via Supabase
  // Auth (owner-approved exception, design D2). Never writes a log row.
  listActions: adminProcedure
    .input(listAdminActionsInput)
    .output(adminActionListOutput)
    .query(({ ctx, input }) => listActions(ctx.prisma, ctx, adminEmailLookup(), input)),

  revokeTrainer: adminProcedure
    .input(clubTrainerIdInput)
    .output(revokeClubTrainerOutput)
    .mutation(({ ctx, input }) => revokeTrainer(ctx.prisma, ctx, input.clubTrainerId)),
});
