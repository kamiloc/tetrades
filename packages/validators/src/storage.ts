import { z } from 'zod';

import { photoVariantEnum, processingStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// Profile photo storage (ADR-015). Paths are always built server-side from
// the caller's athlete; clients never send a bucket or an object path.
//   profile-photo-originals — private, L1 uploads (may carry EXIF)
//   profile-photos          — public, L0 EXIF-stripped WebP variants
// ──────────────────────────────────────────────

export const storageBucketSchema = z.enum(['profile-photos', 'profile-photo-originals']);
export type StorageBucket = z.infer<typeof storageBucketSchema>;

export const photoContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);
export type PhotoContentType = z.infer<typeof photoContentTypeSchema>;

/** `{issuedAtMs}.{ext}` — returned by getUploadUrl, echoed to confirmUpload. */
export const photoUploadIdSchema = z
  .string()
  .regex(/^\d{13}\.(jpg|png|webp)$/, 'Invalid upload id');
export type PhotoUploadId = z.infer<typeof photoUploadIdSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

export const getStorageUploadUrlInput = z.object({
  contentType: photoContentTypeSchema,
});
export type GetStorageUploadUrlInput = z.infer<typeof getStorageUploadUrlInput>;

export const confirmStorageUploadInput = z.object({
  uploadId: photoUploadIdSchema,
});
export type ConfirmStorageUploadInput = z.infer<typeof confirmStorageUploadInput>;

export const getStorageViewUrlInput = z.object({
  variant: photoVariantEnum,
});
export type GetStorageViewUrlInput = z.infer<typeof getStorageViewUrlInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS
// ──────────────────────────────────────────────

export const storageUploadUrlOutput = z.object({
  signedUrl: z.string().url(),
  /** For supabase-js `uploadToSignedUrl(path, token, file)`. */
  token: z.string().min(1),
  /** Object path inside the originals bucket, for `uploadToSignedUrl`. */
  path: z.string().min(1),
  uploadId: photoUploadIdSchema,
  /** Seconds left to confirm the upload; confirmUpload rejects after this. */
  expiresIn: z.number().int().positive(),
});
export type StorageUploadUrlOutput = z.infer<typeof storageUploadUrlOutput>;

export const confirmStorageUploadOutput = z.object({
  processingStatus: processingStatusEnum,
});
export type ConfirmStorageUploadOutput = z.infer<typeof confirmStorageUploadOutput>;

export const signedStorageUrlOutput = z.object({
  signedUrl: z.string().url(),
  expiresIn: z.number(),
});
export type SignedStorageUrlOutput = z.infer<typeof signedStorageUrlOutput>;
