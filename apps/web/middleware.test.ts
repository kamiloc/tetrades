import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { middleware } from './middleware';
import {
  APP_ORIGIN,
  SESSION_COOKIE,
  sessionCookieValue,
  stubAuthEnv,
  stubSupabaseAuth,
} from './test/supabase-stub';

function request(path: string, init: { cookie?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie !== undefined) headers.set('cookie', init.cookie);
  return new NextRequest(new URL(path, APP_ORIGIN), { headers });
}

function setCookieNames(response: Response): string[] {
  return response.headers.getSetCookie().map((line) => line.split('=')[0] ?? '');
}

describe('middleware', () => {
  beforeEach(() => {
    stubAuthEnv();
  });

  it('redirects a sessionless /admin/clubs request to sign-in with the return path', async () => {
    stubSupabaseAuth({ validTokens: [] });
    const response = await middleware(request('/admin/clubs'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${APP_ORIGIN}/login?next=%2Fadmin%2Fclubs`);
  });

  it('keeps the query string in the return path', async () => {
    stubSupabaseAuth({ validTokens: [] });
    const response = await middleware(request('/trainer/invitations?x=1'));
    expect(response.headers.get('location')).toBe(
      `${APP_ORIGIN}/login?next=%2Ftrainer%2Finvitations%3Fx%3D1`,
    );
  });

  it('lets public paths through without a session', async () => {
    stubSupabaseAuth({ validTokens: [] });
    const response = await middleware(request('/login'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes a refreshed session through with the new Set-Cookie headers', async () => {
    stubSupabaseAuth({ refreshedToken: 'fresh', validTokens: ['fresh'] });
    const response = await middleware(
      request('/admin/clubs', { cookie: `${SESSION_COOKIE}=${sessionCookieValue('stale', -60)}` }),
    );
    expect(response.headers.get('location')).toBeNull();
    expect(setCookieNames(response)).toContain(SESSION_COOKIE);
    const line = response.headers.getSetCookie().find((l) => l.startsWith(`${SESSION_COOKIE}=`));
    expect(line).toMatch(/HttpOnly/i);
    expect(line).toMatch(/SameSite=lax/i);
    expect(line).toMatch(/Secure/i);
  });

  it('copies cookies changed during the request onto the redirect', async () => {
    // The refresh is rejected, so Supabase clears the session cookie and the
    // user is sent to sign-in: the clearing must reach the browser.
    stubSupabaseAuth({ validTokens: [] });
    const response = await middleware(
      request('/admin/clubs', { cookie: `${SESSION_COOKIE}=${sessionCookieValue('stale', -60)}` }),
    );
    expect(response.status).toBe(307);
    expect(setCookieNames(response)).toContain(SESSION_COOKIE);
  });

  it('copies a refreshed session onto the redirect when the user is still rejected', async () => {
    stubSupabaseAuth({ refreshedToken: 'fresh', validTokens: [] });
    const response = await middleware(
      request('/admin/clubs', { cookie: `${SESSION_COOKIE}=${sessionCookieValue('stale', -60)}` }),
    );
    expect(response.status).toBe(307);
    expect(setCookieNames(response)).toContain(SESSION_COOKIE);
  });

  it('builds the redirect from the configured origin even with spoofed host headers', async () => {
    stubSupabaseAuth({ validTokens: [] });
    const spoofed = new NextRequest('http://evil.test/admin/clubs', {
      headers: { host: 'evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'http' },
    });
    const response = await middleware(spoofed);
    expect(response.headers.get('location')).toBe(`${APP_ORIGIN}/login?next=%2Fadmin%2Fclubs`);
  });
});
