import { describe, expect, it } from 'vitest';

import {
  confirmStorageUploadInput,
  getStorageUploadUrlInput,
  getStorageViewUrlInput,
  storageBucketSchema,
  storageUploadUrlOutput,
} from './storage.js';

describe('storage buckets', () => {
  it('lists exactly the public variants bucket and the private originals bucket', () => {
    expect(storageBucketSchema.options).toEqual(['profile-photos', 'profile-photo-originals']);
  });
});

describe('getStorageUploadUrlInput', () => {
  it('accepts supported image types', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(getStorageUploadUrlInput.safeParse({ contentType }).success).toBe(true);
    }
  });

  it('rejects other types', () => {
    for (const contentType of ['image/heic', 'application/pdf', 'image/svg+xml']) {
      expect(getStorageUploadUrlInput.safeParse({ contentType }).success).toBe(false);
    }
  });

  it('does not accept a client-supplied path or bucket', () => {
    const parsed = getStorageUploadUrlInput.parse({
      contentType: 'image/jpeg',
      fileName: '../other-athlete/original.jpg',
      bucket: 'profile-photos',
    });
    expect(parsed).toEqual({ contentType: 'image/jpeg' });
  });
});

describe('confirmStorageUploadInput', () => {
  it('accepts a well-formed upload id', () => {
    expect(
      confirmStorageUploadInput.safeParse({ uploadId: '1760400000000-0123456789abcdef.jpg' })
        .success,
    ).toBe(true);
  });

  it('rejects path traversal, other extensions, and malformed timestamps or nonces', () => {
    for (const uploadId of [
      '../1760400000000-0123456789abcdef.jpg',
      'abc/1760400000000-0123456789abcdef.jpg',
      '1760400000000-0123456789abcdef.gif',
      '176040000000-0123456789abcdef.jpg',
      '1760400000000-0123456789abcdef',
      // Pre-nonce format: timestamp-only ids could collide.
      '1760400000000.jpg',
      '1760400000000-0123456789ABCDEF.jpg',
      '1760400000000-0123456789abcde.jpg',
    ]) {
      expect(confirmStorageUploadInput.safeParse({ uploadId }).success).toBe(false);
    }
  });
});

describe('getStorageViewUrlInput', () => {
  it('takes a variant, not a path', () => {
    expect(getStorageViewUrlInput.safeParse({ variant: 'CARD_400' }).success).toBe(true);
    expect(getStorageViewUrlInput.safeParse({ filePath: 'x/original.jpg' }).success).toBe(false);
  });
});

describe('storageUploadUrlOutput', () => {
  it('requires a positive expiry', () => {
    const base = {
      signedUrl: 'https://example.supabase.co/storage/v1/object/upload/sign/x',
      token: 't',
      path: 'cath/1760400000000-0123456789abcdef.jpg',
      uploadId: '1760400000000-0123456789abcdef.jpg',
    };
    expect(storageUploadUrlOutput.safeParse({ ...base, expiresIn: 900 }).success).toBe(true);
    expect(storageUploadUrlOutput.safeParse({ ...base, expiresIn: 0 }).success).toBe(false);
  });
});
