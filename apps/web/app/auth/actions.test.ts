import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar, requestHeaders, RedirectSignal, resetNextMocks } from '../../test/next-mocks';
import { APP_ORIGIN, stubAuthEnv } from '../../test/supabase-stub';

import { requestSignIn, verifyCode, type LoginState } from './actions';

vi.mock('next/headers', async () => (await import('../../test/next-mocks')).nextHeaders);
vi.mock('next/navigation', async () => (await import('../../test/next-mocks')).nextNavigation);

const initial: LoginState = { step: 'email', email: '', next: '' };

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

interface Captured {
  url: URL;
  body: Record<string, unknown>;
}

/** Stub Supabase: /otp always succeeds, /verify accepts `goodCode`, whoAmI answers `admin`. */
function stubBackends(options: { goodCode?: string; admin?: boolean } = {}) {
  const calls: Captured[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      const body =
        typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
      calls.push({ url, body });
      if (url.pathname === '/auth/v1/otp') return Response.json({});
      if (url.pathname === '/auth/v1/verify') {
        if (body['token'] !== options.goodCode) {
          return Response.json(
            { code: 'otp_expired', message: 'Token has expired or is invalid' },
            { status: 403 },
          );
        }
        return Response.json({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
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
                    message: 'Admin access required.',
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
  return calls;
}

describe('requestSignIn', () => {
  beforeEach(() => {
    resetNextMocks();
    stubAuthEnv();
  });

  it('shows the same code step for a known and an unknown email', async () => {
    stubBackends();
    const known = await requestSignIn(
      initial,
      form({ email: 'laura.benitez@example.co', next: '' }),
    );
    const unknown = await requestSignIn(
      initial,
      form({ email: 'nadie.registrado@example.co', next: '' }),
    );
    expect(known).toEqual({
      step: 'code',
      email: 'laura.benitez@example.co',
      next: '',
      resent: false,
    });
    expect(unknown).toEqual({
      step: 'code',
      email: 'nadie.registrado@example.co',
      next: '',
      resent: false,
    });
  });

  it('builds emailRedirectTo from WEB_URL even with a spoofed Host', async () => {
    requestHeaders.set('host', 'evil.test');
    requestHeaders.set('x-forwarded-host', 'evil.test');
    const calls = stubBackends();
    await requestSignIn(initial, form({ email: 'laura.benitez@example.co', next: '/admin/clubs' }));
    const otp = calls.find((c) => c.url.pathname === '/auth/v1/otp');
    expect(otp?.url.searchParams.get('redirect_to')).toBe(
      `${APP_ORIGIN}/auth/callback?next=%2Fadmin%2Fclubs`,
    );
    expect(otp?.body['create_user']).toBe(true);
  });

  it('drops an unsafe return target', async () => {
    const calls = stubBackends();
    const state = await requestSignIn(
      initial,
      form({ email: 'laura.benitez@example.co', next: '//evil.test' }),
    );
    expect(state.next).toBe('');
    const otp = calls.find((c) => c.url.pathname === '/auth/v1/otp');
    expect(otp?.url.searchParams.get('redirect_to')).toBe(`${APP_ORIGIN}/auth/callback`);
  });

  it('rejects an invalid email without calling Supabase', async () => {
    const calls = stubBackends();
    const state = await requestSignIn(initial, form({ email: 'not-an-email', next: '' }));
    expect(state).toMatchObject({ step: 'email', error: 'invalid-email' });
    expect(calls).toHaveLength(0);
  });
});

describe('verifyCode', () => {
  const codeStep: LoginState = { step: 'code', email: 'laura.benitez@example.co', next: '' };

  beforeEach(() => {
    resetNextMocks();
    stubAuthEnv();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/trpc');
  });

  it('keeps a wrong code on the code step and creates no session', async () => {
    stubBackends({ goodCode: '123456' });
    const state = await verifyCode(
      codeStep,
      form({ email: codeStep.email, code: '000000', next: '' }),
    );
    expect(state).toMatchObject({ step: 'code', error: 'invalid-code' });
    expect([...cookieJar.values()].filter((c) => c.value !== '')).toHaveLength(0);
  });

  it('signs in with the right code and lands an admin on the club list', async () => {
    stubBackends({ goodCode: '123456', admin: true });
    const error = await verifyCode(
      codeStep,
      form({ email: codeStep.email, code: '123456', next: '' }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RedirectSignal);
    expect((error as RedirectSignal).location).toBe('/admin/clubs');
    const session = [...cookieJar.values()].filter((c) => c.value !== '');
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session)
      expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: 'lax' });
  });

  it('lands a non-admin on /trainer, and honours a safe next', async () => {
    stubBackends({ goodCode: '123456', admin: false });
    const toDefault = await verifyCode(
      codeStep,
      form({ email: codeStep.email, code: '123456', next: '' }),
    ).catch((e: unknown) => e);
    expect((toDefault as RedirectSignal).location).toBe('/trainer');
    const toNext = await verifyCode(
      codeStep,
      form({ email: codeStep.email, code: '123456', next: '/admin/clubs?status=ALL' }),
    ).catch((e: unknown) => e);
    expect((toNext as RedirectSignal).location).toBe('/admin/clubs?status=ALL');
  });
});
