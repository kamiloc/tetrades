import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar, resetNextMocks } from '../../../test/next-mocks';
import { APP_ORIGIN, stubAuthEnv } from '../../../test/supabase-stub';

import { GET } from './route';

vi.mock('next/headers', async () => (await import('../../../test/next-mocks')).nextHeaders);

const VERIFIER_COOKIE = 'sb-supabase-auth-token-code-verifier';

function stubExchange(options: { ok: boolean; admin?: boolean }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.pathname === '/auth/v1/token') {
        if (!options.ok)
          return Response.json({ code: 'bad_code', message: 'invalid' }, { status: 400 });
        return Response.json({
          access_token: 'link-token',
          refresh_token: 'link-refresh',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: 'u1',
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: '',
          },
        });
      }
      if (url.pathname === '/trpc/admin.whoAmI') {
        return options.admin
          ? Response.json({ result: { data: { json: { isAdmin: true } } } })
          : Response.json(
              {
                error: {
                  json: {
                    message: 'no',
                    code: -32003,
                    data: { code: 'FORBIDDEN', httpStatus: 403 },
                  },
                },
              },
              { status: 403 },
            );
      }
      return Response.json({}, { status: 500 });
    }),
  );
}

function callback(query: string): NextRequest {
  // Arrives on a spoofed host: the redirect must still use WEB_URL.
  return new NextRequest(`http://evil.test/auth/callback${query}`, {
    headers: { host: 'evil.test', 'x-forwarded-host': 'evil.test' },
  });
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    resetNextMocks();
    stubAuthEnv();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/trpc');
    cookieJar.set(VERIFIER_COOKIE, { name: VERIFIER_COOKIE, value: '"verifier"' });
  });

  it('redirects a safe next on the configured origin', async () => {
    stubExchange({ ok: true });
    const response = await GET(callback('?code=abc&next=%2Fadmin%2Fclubs'));
    expect(response.headers.get('location')).toBe(`${APP_ORIGIN}/admin/clubs`);
    expect(cookieJar.get('sb-supabase-auth-token')?.options).toMatchObject({ httpOnly: true });
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])(
    'ignores the unsafe next %s and uses the default landing',
    async (next) => {
      stubExchange({ ok: true, admin: true });
      const response = await GET(callback(`?code=abc&next=${encodeURIComponent(next)}`));
      expect(response.headers.get('location')).toBe(`${APP_ORIGIN}/admin/clubs`);
    },
  );

  it('sends a failed exchange back to sign-in with the link error', async () => {
    stubExchange({ ok: false });
    const response = await GET(callback('?code=bad&next=%2Fadmin%2Fclubs'));
    expect(response.headers.get('location')).toBe(
      `${APP_ORIGIN}/login?error=link&next=%2Fadmin%2Fclubs`,
    );
  });

  it('handles a missing code', async () => {
    stubExchange({ ok: true });
    const response = await GET(callback(''));
    expect(response.headers.get('location')).toBe(`${APP_ORIGIN}/login?error=link`);
  });
});
