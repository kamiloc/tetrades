import { describe, expect, it, vi } from 'vitest';

// Fails the test if anything in server.ts's module graph loads React.
vi.mock('react', () => {
  throw new Error('react must not be imported by @packages/api-client/server');
});

const { createServerApiClient } = await import('./server.js');

describe('createServerApiClient', () => {
  it('sends the bearer from getToken, uncached', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ result: { data: { json: { isAdmin: true } } } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createServerApiClient({
      url: 'http://api.test/trpc',
      getToken: async () => 'session-token',
    });

    await expect(client.admin.whoAmI.query()).resolves.toEqual({ isAdmin: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(input)).pathname).toBe('/trpc/admin.whoAmI');
    expect(init?.cache).toBe('no-store');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer session-token');
  });

  it('sends no authorization without a session', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ result: { data: { json: { isAdmin: true } } } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createServerApiClient({
      url: 'http://api.test/trpc',
      getToken: async () => null,
    });

    await client.admin.whoAmI.query();

    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
  });
});
