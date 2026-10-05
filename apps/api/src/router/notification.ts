import {
  deviceTokenOwnerOutput,
  registerDeviceTokenInput,
  removeDeviceTokenInput,
  removeDeviceTokenOutput,
} from '@packages/validators';

import { registerDeviceToken, removeDeviceToken } from '../services/deviceTokens.js';
import { requireViewer } from '../services/viewer.js';
import { protectedProcedure, router } from '../trpc.js';

// Owner-only by construction: the account always comes from ctx.userId, so
// trainer-only accounts (no athlete profile) can register devices too.
export const notificationRouter = router({
  registerDeviceToken: protectedProcedure
    .input(registerDeviceTokenInput)
    .output(deviceTokenOwnerOutput)
    .mutation(async ({ ctx, input }) =>
      registerDeviceToken(ctx.prisma, await requireViewer(ctx.prisma, ctx.userId), input),
    ),

  removeDeviceToken: protectedProcedure
    .input(removeDeviceTokenInput)
    .output(removeDeviceTokenOutput)
    .mutation(async ({ ctx, input }) =>
      removeDeviceToken(ctx.prisma, await requireViewer(ctx.prisma, ctx.userId), input),
    ),
});
