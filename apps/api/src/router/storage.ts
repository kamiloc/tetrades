import {
  confirmStorageUploadInput,
  confirmStorageUploadOutput,
  getStorageUploadUrlInput,
  getStorageViewUrlInput,
  signedStorageUrlOutput,
  storageUploadUrlOutput,
} from '@packages/validators';

import { createSupabasePhotoStorage, type PhotoStorage } from '../lib/supabaseAdmin.js';
import { confirmUpload, getUploadUrl, getViewUrl } from '../services/storage.js';
import { requireViewerAthlete } from '../services/viewer.js';
import { protectedProcedure, router } from '../trpc.js';

// Created on first use so routers load without the service-role key (tests, bare dev).
let photoStorage: PhotoStorage | null = null;
const storage = (): PhotoStorage => (photoStorage ??= createSupabasePhotoStorage());

export const storageRouter = router({
  getUploadUrl: protectedProcedure
    .input(getStorageUploadUrlInput)
    .output(storageUploadUrlOutput)
    .mutation(async ({ ctx, input }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return getUploadUrl(
        { storage: storage(), log: ctx.log },
        { athleteId, requestId: ctx.requestId },
        input,
      );
    }),

  confirmUpload: protectedProcedure
    .input(confirmStorageUploadInput)
    .output(confirmStorageUploadOutput)
    .mutation(async ({ ctx, input }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return confirmUpload(
        { prisma: ctx.prisma, storage: storage(), jobs: ctx.jobs, log: ctx.log },
        { athleteId, requestId: ctx.requestId },
        input,
      );
    }),

  getViewUrl: protectedProcedure
    .input(getStorageViewUrlInput)
    .output(signedStorageUrlOutput)
    .query(async ({ ctx, input }) => {
      const { athleteId } = await requireViewerAthlete(ctx.prisma, ctx.userId);
      return getViewUrl(
        { prisma: ctx.prisma, storage: storage(), log: ctx.log },
        { athleteId, requestId: ctx.requestId },
        input,
      );
    }),
});
