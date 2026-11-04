import { vi } from 'vitest';

// Test helpers for code that talks to Supabase Auth through @supabase/ssr.
// Supabase is stubbed at the fetch level, so the real client logic runs.

export const SUPABASE_URL = 'http://supabase.test';
// @supabase/ssr names the cookie after the first host label of the URL.
export const SESSION_COOKIE = 'sb-supabase-auth-token';
export const APP_ORIGIN = 'https://portal.example.co';

export function stubAuthEnv(): void {
  vi.stubEnv('WEB_URL', APP_ORIGIN);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
}

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  email: 'laura.benitez@example.co',
  email_confirmed_at: '2026-10-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-01T00:00:00Z',
};

function session(accessToken: string, expiresInSeconds: number) {
  return {
    access_token: accessToken,
    refresh_token: `${accessToken}-refresh`,
    expires_in: expiresInSeconds,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    token_type: 'bearer',
    user,
  };
}

/** Cookie value for a stored session, in @supabase/ssr's base64 format. */
export function sessionCookieValue(accessToken: string, expiresInSeconds: number): string {
  const json = JSON.stringify(session(accessToken, expiresInSeconds));
  return `base64-${Buffer.from(json).toString('base64url')}`;
}

/**
 * Stub Supabase Auth: a refresh returns `refreshedToken`, and /user accepts
 * `validTokens`. Returns the mock so tests can inspect calls.
 */
export function stubSupabaseAuth(options: { refreshedToken?: string; validTokens: string[] }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (
      url.pathname === '/auth/v1/token' &&
      url.searchParams.get('grant_type') === 'refresh_token'
    ) {
      if (options.refreshedToken === undefined) {
        return Response.json({ error: 'invalid_grant' }, { status: 400 });
      }
      return Response.json(session(options.refreshedToken, 3600));
    }
    if (url.pathname === '/auth/v1/user') {
      const headers = new Headers(init?.headers);
      const token = headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
      if (options.validTokens.includes(token)) return Response.json(user);
      return Response.json({ message: 'invalid JWT' }, { status: 401 });
    }
    return Response.json({ message: 'unexpected' }, { status: 500 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
