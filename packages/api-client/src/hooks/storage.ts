import type { PhotoVariant } from '@packages/validators';

import { trpc } from '../client.js';

// Profile photo upload (ADR-015): request a signed upload URL, upload the file
// straight to Supabase Storage, then confirm within 15 minutes to start processing.
export const useProfilePhotoUploadUrl = () => trpc.storage.getUploadUrl.useMutation();

export const useConfirmProfilePhotoUpload = () => trpc.storage.confirmUpload.useMutation();

// Owner-only signed URL (15 minutes) for one of the caller's own photo variants.
export const useProfilePhotoViewUrl = (variant: PhotoVariant) =>
  trpc.storage.getViewUrl.useQuery({ variant });
