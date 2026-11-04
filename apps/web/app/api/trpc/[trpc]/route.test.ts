import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APP_ORIGIN,
  SESSION_COOKIE,
  sessionCookieValue,
  stubAuthEnv,
} from '../../../../test/supabase-stub';

import { GET, POST } from './route';

const logInfo = vi.fn();
const logError = vi.fn();
vi.mock('../../../../lib/log', () => ({
  logInfo: (...args: unknown[]) => logInfo(...args),
  logError: (...args: unknown[]) => logError(...args),
}));

const API = 'http://api.test/trpc';

interface UpstreamCall {
  url: string;
  init: RequestInit;
  body: Uint8Array | null;
}

/**
 * Stub every fetch: Supabase refreshes return `fresh`; anything under the API
 * answers with `reply`. Upstream calls are recorded with their body bytes.
 */
function stubFetch(reply: () => Response = () => Response.json({ result: { data: { json: 1 } } })) {
  const calls: UpstreamCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      if (url.startsWith('http://supabase.test/auth/v1/token')) {
        return Response.json({
          access_token: 'fresh',
          refresh_token: 'fresh-refresh',
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
      const body = init.body ? new Uint8Array(await new Response(init.body).arrayBuffer()) : null;
      calls.push({ url, init, body });
      return reply();
    }),
  );
  return calls;
}

function req(
  method: 'GET' | 'POST',
  pathAndQuery: string,
  options: { headers?: Record<string, string>; body?: string; base?: string } = {},
) {
  return new NextRequest(new URL(`/api/trpc/${pathAndQuery}`, options.base ?? APP_ORIGIN), {
    method,
    headers: options.headers,
    body: options.body,
  });
}

function ctx(trpc: string) {
  return { params: Promise.resolve({ trpc }) };
}

const withSession = (token = 'live-token', expiresIn = 3600) => ({
  cookie: `${SESSION_COOKIE}=${sessionCookieValue(token, expiresIn)}`,
});

describe('tRPC proxy', () => {
  beforeEach(() => {
    stubAuthEnv();
    vi.stubEnv('NEXT_PUBLIC_API_URL', API);
    logInfo.mockReset();
    logError.mockReset();
  });

  it('keeps the path and input query of a single GET', async () => {
    const calls = stubFetch();
    const input = encodeURIComponent(JSON.stringify({ json: { clubId: 'c1' } }));
    await GET(req('GET', `admin.getClub?input=${input}`), ctx('admin.getClub'));
    expect(calls[0]?.url).toBe(`${API}/admin.getClub?input=${input}`);
    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.body).toBeNull();
  });

  it('keeps the procedures and query of a batched GET', async () => {
    const calls = stubFetch();
    const input = encodeURIComponent(
      JSON.stringify({ 0: { json: null }, 1: { json: { status: 'ALL' } } }),
    );
    await GET(
      req('GET', `admin.whoAmI,admin.listClubs?batch=1&input=${input}`),
      ctx('admin.whoAmI,admin.listClubs'),
    );
    expect(calls[0]?.url).toBe(`${API}/admin.whoAmI,admin.listClubs?batch=1&input=${input}`);
  });

  it.each([
    [
      'single',
      'admin.createClub',
      '',
      JSON.stringify({ json: { slug: 'liga-antioquia', name: 'Liga Antioqueña' } }),
    ],
    [
      'batched',
      'admin.updateClub,admin.reactivateClub',
      '?batch=1',
      JSON.stringify({ 0: { json: { clubId: 'a' } }, 1: { json: { clubId: 'b' } } }),
    ],
  ])('forwards a %s POST body byte-identical', async (_label, procedure, query, body) => {
    const calls = stubFetch();
    await POST(
      req('POST', `${procedure}${query}`, {
        headers: { origin: APP_ORIGIN, 'content-type': 'application/json' },
        body,
      }),
      ctx(procedure),
    );
    expect(calls[0]?.url).toBe(`${API}/${procedure}${query}`);
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.body).toEqual(new TextEncoder().encode(body));
    expect(new Headers(calls[0]?.init.headers).get('content-type')).toBe('application/json');
  });

  it('sends no authorization without a session', async () => {
    const calls = stubFetch();
    await GET(req('GET', 'trainerInvitation.listMine'), ctx('trainerInvitation.listMine'));
    expect(new Headers(calls[0]?.init.headers).has('authorization')).toBe(false);
  });

  it('adds the session bearer and never forwards cookies or a client authorization', async () => {
    const calls = stubFetch();
    await GET(
      req('GET', 'trainerInvitation.listMine', {
        headers: {
          ...withSession('live-token'),
          authorization: 'Bearer forged',
          'x-forwarded-for': '1.2.3.4',
        },
      }),
      ctx('trainerInvitation.listMine'),
    );
    const sent = new Headers(calls[0]?.init.headers);
    expect(sent.get('authorization')).toBe('Bearer live-token');
    expect(sent.has('cookie')).toBe(false);
    expect(sent.has('x-forwarded-for')).toBe(false);
    expect(sent.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ['a cross-origin POST', { origin: 'https://evil.test' }],
    ['a POST without Origin', {}],
  ])('rejects %s with 403 and no upstream call', async (_label, headers) => {
    const calls = stubFetch();
    const response = await POST(
      req('POST', 'admin.createClub', { headers, body: '{}' }),
      ctx('admin.createClub'),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(calls).toHaveLength(0);
  });

  it('judges a POST only against WEB_URL, whatever Host and X-Forwarded-Host say', async () => {
    const spoof = { host: 'evil.test', 'x-forwarded-host': 'evil.test' };
    const calls = stubFetch();
    const ours = await POST(
      req('POST', 'admin.createClub', {
        base: 'http://evil.test',
        headers: { ...spoof, origin: APP_ORIGIN },
        body: '{}',
      }),
      ctx('admin.createClub'),
    );
    expect(ours.status).toBe(200);
    const theirs = await POST(
      req('POST', 'admin.createClub', {
        base: 'http://evil.test',
        headers: { ...spoof, origin: 'http://evil.test' },
        body: '{}',
      }),
      ctx('admin.createClub'),
    );
    expect(theirs.status).toBe(403);
    expect(calls).toHaveLength(1);
  });

  it.each([
    [200, 'application/json'],
    [404, 'application/json'],
    [500, 'application/json'],
  ])('passes status %i and content-type through, never cached', async (status, contentType) => {
    const calls = stubFetch(
      () =>
        new Response('{"x":1}', {
          status,
          headers: { 'content-type': contentType, 'cache-control': 'public, max-age=600' },
        }),
    );
    const response = await GET(req('GET', 'admin.listClubs'), ctx('admin.listClubs'));
    expect(calls[0]?.init.cache).toBe('no-store');
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toBe(contentType);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe('{"x":1}');
  });

  it('writes cookies refreshed during the request on the response', async () => {
    const calls = stubFetch();
    const response = await GET(
      req('GET', 'admin.listClubs', { headers: withSession('stale', -60) }),
      ctx('admin.listClubs'),
    );
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer fresh');
    const line = response.headers.getSetCookie().find((l) => l.startsWith(`${SESSION_COOKIE}=`));
    expect(line).toMatch(/HttpOnly/i);
  });

  it.each(['../health', 'admin/../../x', 'admin.getClub%2F..', ''])(
    'answers 404 for the malformed procedure path %j without an upstream call',
    async (procedure) => {
      const calls = stubFetch();
      const response = await GET(req('GET', 'x'), ctx(procedure));
      expect(response.status).toBe(404);
      expect(calls).toHaveLength(0);
    },
  );

  it('never logs headers, tokens or the body', async () => {
    stubFetch();
    const body = JSON.stringify({ json: { email: 'nuevo.entrenador@example.co' } });
    await POST(
      req('POST', 'admin.inviteTrainer', {
        headers: {
          ...withSession('live-token'),
          origin: APP_ORIGIN,
          'content-type': 'application/json',
        },
        body,
      }),
      ctx('admin.inviteTrainer'),
    );
    expect(logInfo).toHaveBeenCalledTimes(1);
    const [, fields] = logInfo.mock.calls[0] ?? [];
    expect(Object.keys(fields as object).sort()).toEqual([
      'method',
      'procedure',
      'requestId',
      'status',
    ]);
    const logged = JSON.stringify(logInfo.mock.calls);
    expect(logged).not.toContain('live-token');
    expect(logged).not.toContain('nuevo.entrenador');
    expect(logged).not.toContain(SESSION_COOKIE);
  });
});
