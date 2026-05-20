import { z } from 'zod';

export const storageBucketSchema = z.enum(['medical-documents', 'profile-photos']);
export type StorageBucket = z.infer<typeof storageBucketSchema>;

export const getStorageUploadUrlInput = z.object({
  bucket: storageBucketSchema,
  fileName: z.string(),
});
export type GetStorageUploadUrlInput = z.infer<typeof getStorageUploadUrlInput>;

export const getStorageViewUrlInput = z.object({
  bucket: storageBucketSchema,
  filePath: z.string(),
});
export type GetStorageViewUrlInput = z.infer<typeof getStorageViewUrlInput>;

export const signedStorageUrlOutput = z.object({
  signedUrl: z.string().url(),
  expiresIn: z.number(),
});
export type SignedStorageUrlOutput = z.infer<typeof signedStorageUrlOutput>;
