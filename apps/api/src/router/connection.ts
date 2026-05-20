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
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  acceptRequest: protectedProcedure
    .input(connectionIdInput)
    .output(athleteConnectionSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  rejectRequest: protectedProcedure
    .input(connectionIdInput)
    .output(athleteConnectionSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  listConnections: protectedProcedure
    .input(listConnectionsInput)
    .output(athleteConnectionListOutput)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),
});
