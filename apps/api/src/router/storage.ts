import {
  getStorageUploadUrlInput,
  getStorageViewUrlInput,
  signedStorageUrlOutput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

export const storageRouter = router({
  getUploadUrl: protectedProcedure
    .input(getStorageUploadUrlInput)
    .output(signedStorageUrlOutput)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  getViewUrl: protectedProcedure
    .input(getStorageViewUrlInput)
    .output(signedStorageUrlOutput)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),
});
