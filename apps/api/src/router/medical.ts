import {
  medicalDocumentIdInput,
  medicalDocumentSchema,
  ocrJobSchema,
  rejectMedicalDocumentInput,
  uploadMedicalDocumentInput,
  uploadMedicalDocumentOutput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

export const medicalRouter = router({
  uploadDocument: protectedProcedure
    .input(uploadMedicalDocumentInput)
    .output(uploadMedicalDocumentOutput)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  getDocumentStatus: protectedProcedure
    .input(medicalDocumentIdInput)
    .output(medicalDocumentSchema)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  getOCRResult: protectedProcedure
    .input(medicalDocumentIdInput)
    .output(ocrJobSchema)
    .query(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  verifyDocument: protectedProcedure
    .input(medicalDocumentIdInput)
    .output(medicalDocumentSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),

  rejectDocument: protectedProcedure
    .input(rejectMedicalDocumentInput)
    .output(medicalDocumentSchema)
    .mutation(() => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED' });
    }),
});
