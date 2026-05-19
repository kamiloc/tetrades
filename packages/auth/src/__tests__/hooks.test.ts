/**
 * Hooks tests run under jsdom (configured in vitest.config.ts). Supabase is
 * never called for real — the client is mocked at the auth-namespace level.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthProvider,
  useAuth,
  useSession,
  useSignIn,
  useSignOut,
} from '../hooks.js';

interface MockedAuth {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signInWithOtp: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
}

function buildMockClient(overrides: Partial<MockedAuth> = {}): {
  client: SupabaseClient;
  auth: MockedAuth;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  const unsubscribe = vi.fn();
  const auth: MockedAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe } },
    }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  const client = { auth } as unknown as SupabaseClient;
  return { client, auth, unsubscribe };
}

function makeWrapper(client: SupabaseClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(AuthProvider, { client }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// useAuth / AuthProvider
// ──────────────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /must be used within an AuthProvider/,
    );
  });

  it('initializes with isLoading: true and resolves once getSession returns', async () => {
    const fakeSession = {
      access_token: 'tok',
      refresh_token: 'ref',
      expires_in: 3600,
      expires_at: 9999999999,
      token_type: 'bearer',
      user: { id: 'u_1', email: 'a@b.com' },
    };
    const { client } = buildMockClient({
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: fakeSession }, error: null }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(client) });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.user).toEqual({ id: 'u_1', email: 'a@b.com' });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    const { client, unsubscribe } = buildMockClient();
    const { unmount } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => {
      expect(unsubscribe).not.toHaveBeenCalled();
    });
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useSignIn
// ──────────────────────────────────────────────────────────────────────────────

describe('useSignIn', () => {
  it('signInWithMagicLink calls signInWithOtp with emailRedirectTo', async () => {
    const { client, auth } = buildMockClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      const res = await result.current.signInWithMagicLink(
        'athlete@example.co',
        'https://app.example.co/auth/callback',
      );
      expect(res).toEqual({ error: null });
    });

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'athlete@example.co',
      options: { emailRedirectTo: 'https://app.example.co/auth/callback' },
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('signInWithOtp calls signInWithOtp WITHOUT emailRedirectTo (mobile flow)', async () => {
    const { client, auth } = buildMockClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.signInWithOtp('athlete@example.co');
    });

    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'athlete@example.co' });
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('verifyOtp calls client.auth.verifyOtp with type "email"', async () => {
    const { client, auth } = buildMockClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.verifyOtp('athlete@example.co', '123456');
    });

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'athlete@example.co',
      token: '123456',
      type: 'email',
    });
  });

  it('surfaces the Supabase error message via state and the return value', async () => {
    const { client } = buildMockClient({
      signInWithOtp: vi.fn().mockResolvedValue({ error: { message: 'rate limited' } }),
    });
    const { result } = renderHook(() => useSignIn(), {
      wrapper: makeWrapper(client),
    });

    let returned: { error: string | null } = { error: null };
    await act(async () => {
      returned = await result.current.signInWithMagicLink('a@b.co');
    });

    expect(returned).toEqual({ error: 'rate limited' });
    expect(result.current.error).toBe('rate limited');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useSignOut
// ──────────────────────────────────────────────────────────────────────────────

describe('useSignOut', () => {
  it('signOut calls client.auth.signOut', async () => {
    const { client, auth } = buildMockClient();
    const { result } = renderHook(() => useSignOut(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      const res = await result.current.signOut();
      expect(res).toEqual({ error: null });
    });

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useSession
// ──────────────────────────────────────────────────────────────────────────────

describe('useSession', () => {
  it('exposes the current session from context', async () => {
    const fakeSession = {
      access_token: 'tok',
      refresh_token: 'ref',
      expires_in: 3600,
      expires_at: 9999999999,
      token_type: 'bearer',
      user: { id: 'u_2', email: 'c@d.com' },
    };
    const { client } = buildMockClient({
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: fakeSession }, error: null }),
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.user?.id).toBe('u_2');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null session and isAuthenticated: false when signed out', async () => {
    const { client } = buildMockClient();
    const { result } = renderHook(() => useSession(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
