import {
  athleteConnectionListOutput,
  athleteConnectionSchema,
  connectionIdInput,
  listConnectionsInput,
  sendAthleteConnectionRequestInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

export const connectionRouter = router({
  sendRequest: protectedProcedure
    .input(sendAthleteConnectionRequestInput)
    .output(athleteConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });
      const requesterId = userAccount?.athlete?.id;
      if (!requesterId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete profile not found for current user',
        });
      }

      if (requesterId === input.targetAthleteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot send a connection request to yourself',
        });
      }

      const target = await ctx.prisma.athlete.findUnique({
        where: { id: input.targetAthleteId },
        select: { id: true },
      });
      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target athlete not found',
        });
      }

      const existing = await ctx.prisma.athleteConnection.findFirst({
        where: {
          OR: [
            { requesterId, addresseeId: input.targetAthleteId },
            { requesterId: input.targetAthleteId, addresseeId: requesterId },
          ],
        },
        select: { id: true, status: true, requesterId: true },
      });

      if (existing && (existing.status === 'PENDING' || existing.status === 'ACCEPTED')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A connection with this athlete already exists',
        });
      }

      // When an existing DECLINED/BLOCKED record is in the same direction (requesterId→addresseeId),
      // we must update it rather than create — the DB unique([requesterId, addresseeId]) constraint
      // prevents a second record with the same requester-addressee pair.
      if (existing) {
        if (existing.status === 'BLOCKED') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot send a connection request to this athlete',
          });
        }

        // DECLINED in the same direction: delete the stale record and fall through to create.
        // Updating a DECLINED record back to PENDING violates the state machine —
        // it preserves a record that was explicitly rejected, breaking audit semantics.
        if (existing.requesterId === requesterId) {
          await ctx.prisma.athleteConnection.delete({ where: { id: existing.id } });
        }
      }

      return ctx.prisma.athleteConnection.create({
        data: {
          requesterId,
          addresseeId: input.targetAthleteId,
          status: 'PENDING',
        },
        select: {
          id: true,
          requesterId: true,
          addresseeId: true,
          status: true,
          createdAt: true,
          respondedAt: true,
        },
      });
    }),

  acceptRequest: protectedProcedure
    .input(connectionIdInput)
    .output(athleteConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });
      const callerId = userAccount?.athlete?.id;
      if (!callerId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete profile not found for current user',
        });
      }

      const connection = await ctx.prisma.athleteConnection.findUnique({
        where: { id: input.connectionId },
        select: { id: true, status: true, requesterId: true, addresseeId: true },
      });
      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection request not found',
        });
      }

      if (callerId !== connection.addresseeId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only accept requests sent to you',
        });
      }

      if (connection.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending requests can be accepted',
        });
      }

      const [updatedConnection] = await ctx.prisma.$transaction([
        ctx.prisma.athleteConnection.update({
          where: { id: input.connectionId },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
          select: {
            id: true,
            requesterId: true,
            addresseeId: true,
            status: true,
            createdAt: true,
            respondedAt: true,
          },
        }),
        ctx.prisma.athletePublicProfile.update({
          where: { athleteId: connection.requesterId },
          data: { connectionCountCache: { increment: 1 } },
          select: { athleteId: true },
        }),
        ctx.prisma.athletePublicProfile.update({
          where: { athleteId: connection.addresseeId },
          data: { connectionCountCache: { increment: 1 } },
          select: { athleteId: true },
        }),
      ]);

      return updatedConnection;
    }),

  rejectRequest: protectedProcedure
    .input(connectionIdInput)
    .output(athleteConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });
      const callerId = userAccount?.athlete?.id;
      if (!callerId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete profile not found for current user',
        });
      }

      const connection = await ctx.prisma.athleteConnection.findUnique({
        where: { id: input.connectionId },
        select: { id: true, status: true, addresseeId: true },
      });
      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection request not found',
        });
      }

      if (callerId !== connection.addresseeId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only reject requests sent to you',
        });
      }

      if (connection.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending requests can be rejected',
        });
      }

      return ctx.prisma.athleteConnection.update({
        where: { id: input.connectionId },
        data: { status: 'DECLINED', respondedAt: new Date() },
        select: {
          id: true,
          requesterId: true,
          addresseeId: true,
          status: true,
          createdAt: true,
          respondedAt: true,
        },
      });
    }),

  listConnections: protectedProcedure
    .input(listConnectionsInput)
    .output(athleteConnectionListOutput)
    .query(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });
      const callerId = userAccount?.athlete?.id;
      if (!callerId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete profile not found for current user',
        });
      }

      if (callerId !== input.athleteId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own connections',
        });
      }

      return ctx.prisma.athleteConnection.findMany({
        where: {
          OR: [{ requesterId: input.athleteId }, { addresseeId: input.athleteId }],
          status: 'ACCEPTED',
        },
        select: {
          id: true,
          requesterId: true,
          addresseeId: true,
          status: true,
          createdAt: true,
          respondedAt: true,
        },
        orderBy: { respondedAt: 'desc' },
      });
    }),
});
