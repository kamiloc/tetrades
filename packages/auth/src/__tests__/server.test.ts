import { describe, expect, it, vi } from 'vitest';

import {
  BEARER_PREFIX,
  extractBearerToken,
  verifyAccessToken,
  type SupabaseClient,
} from '../index.js';

// ──────────────────────────────────────────────────────────────────────────────
// extractBearerToken
// ──────────────────────────────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('returns the token from a well-formed Authorization header', () => {
    expect(extractBearerToken(`${BEARER_PREFIX}abc.def.ghi`)).toBe('abc.def.ghi');
  });

  it('trims trailing whitespace from the token', () => {
    expect(extractBearerToken(`${BEARER_PREFIX}token   `)).toBe('token');
  });

  it('returns null when the header is missing', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it('returns null when the scheme is not Bearer', () => {
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('bearer abc')).toBeNull();
  });

  it('returns null when the token portion is empty', () => {
    expect(extractBearerToken(BEARER_PREFIX)).toBeNull();
    expect(extractBearerToken(`${BEARER_PREFIX}   `)).toBeNull();
  });

  it('rejects non-string header values', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// verifyAccessToken
// ──────────────────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  email: string | null;
}

interface MockGetUserResult {
  data: { user: MockUser | null };
  error: { message: string; status?: number } | null;
}

function buildMockVerifier(result: MockGetUserResult): {
  client: SupabaseClient;
  getUser: ReturnType<typeof vi.fn>;
} {
  const getUser = vi.fn().mockResolvedValue(result);
  const client = { auth: { getUser } } as unknown as SupabaseClient;
  return { client, getUser };
}

describe('verifyAccessToken', () => {
  it('returns the userId and email from a valid token', async () => {
    const { client, getUser } = buildMockVerifier({
      data: { user: { id: 'user_123', email: 'a@b.com' } },
      error: null,
    });

    const verified = await verifyAccessToken(client, 'fake.jwt.token');

    expect(verified).toEqual({ userId: 'user_123', email: 'a@b.com' });
    expect(getUser).toHaveBeenCalledWith('fake.jwt.token');
  });

  it('normalizes a missing email to null', async () => {
    const { client } = buildMockVerifier({
      data: { user: { id: 'user_456', email: null } },
      error: null,
    });

    const verified = await verifyAccessToken(client, 'fake.jwt.token');
    expect(verified.email).toBeNull();
  });

  it('throws when Supabase reports an error', async () => {
    const { client } = buildMockVerifier({
      data: { user: null },
      error: { message: 'jwt expired' },
    });

    await expect(verifyAccessToken(client, 'expired.jwt')).rejects.toThrow('jwt expired');
  });

  it('propagates the Supabase HTTP status on the thrown error', async () => {
    const { client } = buildMockVerifier({
      data: { user: null },
      error: { message: 'jwt expired', status: 401 },
    });

    await expect(verifyAccessToken(client, 'expired.jwt')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('throws when the user is missing without an explicit error', async () => {
    const { client } = buildMockVerifier({
      data: { user: null },
      error: null,
    });

    await expect(verifyAccessToken(client, 'whatever')).rejects.toThrow(
      /Invalid or expired access token/,
    );
  });

  it('refuses to call Supabase with an empty token', async () => {
    const { client, getUser } = buildMockVerifier({
      data: { user: null },
      error: null,
    });

    await expect(verifyAccessToken(client, '   ')).rejects.toThrow(/empty/);
    expect(getUser).not.toHaveBeenCalled();
  });
});
