import { storageBucketSchema } from '@packages/validators';
import { describe, expect, it } from 'vitest';

describe('storage bucket contract', () => {
  it('accepts only the profile photo buckets', () => {
    expect(storageBucketSchema.options).toEqual(['profile-photos', 'profile-photo-originals']);
  });

  it('rejects the removed medical bucket as invalid input', () => {
    expect(storageBucketSchema.safeParse('medical-documents').success).toBe(false);
  });
});
