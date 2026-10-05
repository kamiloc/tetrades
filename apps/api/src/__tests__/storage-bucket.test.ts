import { getStorageUploadUrlInput, storageBucketSchema } from '@packages/validators';
import { describe, expect, it } from 'vitest';

describe('storage bucket contract', () => {
  it('accepts only the profile photo bucket', () => {
    expect(storageBucketSchema.options).toEqual(['profile-photos']);
    expect(
      getStorageUploadUrlInput.safeParse({ bucket: 'profile-photos', fileName: 'a.jpg' }).success,
    ).toBe(true);
  });

  it('rejects the removed medical bucket as invalid input', () => {
    const result = getStorageUploadUrlInput.safeParse({
      bucket: 'medical-documents',
      fileName: 'a.pdf',
    });
    expect(result.success).toBe(false);
  });
});
