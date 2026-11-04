import { describe, expect, it, vi } from 'vitest';

import { createSupabaseWithCookies, forceCookieOptions, type CookieToSet } from './supabase-server';

describe('forceCookieOptions', () => {
  it('forces httpOnly, lax, path and secure even when Supabase passes httpOnly: false', () => {
    expect(
      forceCookieOptions(
        { httpOnly: false, sameSite: 'none', path: '/x', secure: false, maxAge: 400 },
        'https://portal.example.co',
      ),
    ).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 400 });
  });

  it('drops secure only on localhost', () => {
    expect(forceCookieOptions({}, 'http://localhost:3000').secure).toBe(false);
    expect(forceCookieOptions({}, 'http://127.0.0.1:3000').secure).toBe(false);
    expect(forceCookieOptions({}, 'https://portal.example.co').secure).toBe(true);
  });
});

describe('createSupabaseWithCookies', () => {
  it('writes session cookies with the forced options', async () => {
    vi.stubEnv('WEB_URL', 'https://portal.example.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    // Supabase answers the code exchange with a session, which it then stores.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          access_token: 'a.b.c',
          refresh_token: 'r',
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
        }),
      ),
    );
    const written: CookieToSet[] = [];
    const client = createSupabaseWithCookies({
      getAll: () => [{ name: 'sb-supabase-auth-token-code-verifier', value: '"verifier"' }],
      setAll: (cookies) => written.push(...cookies),
    });

    await client.auth.exchangeCodeForSession('code');

    const session = written.filter((c) => c.value !== '');
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) {
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      });
    }
  });
});
