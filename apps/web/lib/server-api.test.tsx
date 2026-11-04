import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar, resetNextMocks } from '../test/next-mocks';
import { SESSION_COOKIE, sessionCookieValue, stubAuthEnv } from '../test/supabase-stub';

import { createServerApi } from './server-api';

vi.mock('next/headers', async () => (await import('../test/next-mocks')).nextHeaders);
vi.mock('next/navigation', async () => ({
  ...(await import('../test/next-mocks')).nextNavigation,
  usePathname: () => '/admin/clubs',
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock('../app/auth/actions', () => ({ signOut: async () => undefined }));

const TOKEN = 'secret-access-token';

function stubFetch(whoAmI: 'admin' | 'forbidden') {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      calls.push({ url, init });
      if (url.includes('/auth/v1/user')) {
        return Response.json({
          id: 'u1',
          aud: 'authenticated',
          email: 'laura.benitez@example.co',
          email_confirmed_at: '2026-10-01T00:00:00Z',
          app_metadata: {},
          user_metadata: {},
          created_at: '',
        });
      }
      if (url.includes('/trpc/admin.whoAmI')) {
        return whoAmI === 'admin'
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
  return calls;
}

describe('server-api', () => {
  beforeEach(() => {
    resetNextMocks();
    stubAuthEnv();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/trpc');
    cookieJar.set(SESSION_COOKIE, { name: SESSION_COOKIE, value: sessionCookieValue(TOKEN, 3600) });
  });

  it('calls the API directly with the session bearer, uncached', async () => {
    const calls = stubFetch('admin');
    const api = await createServerApi();
    await api.admin.whoAmI.query();
    const call = calls.find((c) => c.url.includes('/trpc/admin.whoAmI'));
    expect(call?.url.startsWith('http://api.test/trpc/admin.whoAmI')).toBe(true);
    expect(call?.init.cache).toBe('no-store');
    expect(new Headers(call?.init.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('never puts the token in the admin layout HTML', async () => {
    stubFetch('admin');
    const { default: AdminLayout } = await import('../app/(admin)/admin/layout');
    const html = renderToStaticMarkup(await AdminLayout({ children: <p>clubs</p> }));
    expect(html).toContain('Admin portal');
    expect(html).toContain('laura.benitez@example.co');
    expect(html).not.toContain(TOKEN);
  });

  it('renders not-authorized, without admin markup, for a non-admin', async () => {
    stubFetch('forbidden');
    const { default: AdminLayout } = await import('../app/(admin)/admin/layout');
    const html = renderToStaticMarkup(await AdminLayout({ children: <p>clubs</p> }));
    expect(html).toContain('Not authorized');
    expect(html).not.toContain('Admin portal');
    expect(html).not.toContain('<p>clubs</p>');
  });
});
