import {
  acceptTrainerInvitationOutput,
  myTrainerInvitationListOutput,
  trainerInvitationIdInput,
  trainerInvitationMutationOutput,
} from '@packages/validators';

import {
  acceptInvitation,
  declineInvitation,
  listMyInvitations,
} from '../services/trainerInvitations.js';
import { protectedProcedure, router } from '../trpc.js';

/**
 * The invitee's side of trainer provisioning (ADR-017, design D4). Matching
 * uses ctx.userEmail — the session email only when Supabase confirmed it —
 * so an unconfirmed or different address sees nothing (NOT_FOUND / empty).
 */
export const trainerInvitationRouter = router({
  listMine: protectedProcedure
    .output(myTrainerInvitationListOutput)
    .query(({ ctx }) =>
      listMyInvitations(ctx.prisma, { supabaseUserId: ctx.userId, email: ctx.userEmail }),
    ),

  accept: protectedProcedure
    .input(trainerInvitationIdInput)
    .output(acceptTrainerInvitationOutput)
    .mutation(({ ctx, input }) =>
      acceptInvitation(
        ctx.prisma,
        { supabaseUserId: ctx.userId, email: ctx.userEmail },
        input.invitationId,
      ),
    ),

  decline: protectedProcedure
    .input(trainerInvitationIdInput)
    .output(trainerInvitationMutationOutput)
    .mutation(({ ctx, input }) =>
      declineInvitation(
        ctx.prisma,
        { supabaseUserId: ctx.userId, email: ctx.userEmail },
        input.invitationId,
      ),
    ),
});
