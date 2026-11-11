/**
 * Acting-admin email lookup (add-web-admin-insights design D2): the
 * AdminDirectory port over a fake auth client, and the 5-minute cache.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseAdminDirectory,
  type AdminDirectory,
  type AuthUserLookup,
} from '../lib/supabaseAdmin.js';
import { createCachedEmailLookup, EMAIL_CACHE_TTL_MS } from '../services/adminInsights.js';

const EMAIL = 'valentina.ospina@ligas.co';

// Only the fields getUserEmail reads; the cast stands in for supabase-js types.
function fakeAuth(result: { email?: string; status?: number }): AuthUserLookup {
  return {
    getUserById: vi.fn(() =>
      Promise.resolve(
        result.status === undefined
          ? { data: { user: { email: result.email } }, error: null }
          : { data: { user: null }, error: { status: result.status, message: EMAIL } },
      ),
    ),
  } as unknown as AuthUserLookup;
}

function request() {
  return { requestId: 'req-lookup-1', log: { warn: vi.fn() } };
}

describe('createSupabaseAdminDirectory', () => {
  it('returns the email of an existing user', async () => {
    const directory = createSupabaseAdminDirectory(() => fakeAuth({ email: EMAIL }));
    expect(await directory.getUserEmail('sb-1')).toBe(EMAIL);
  });

  it('returns null for a missing user', async () => {
    const directory = createSupabaseAdminDirectory(() => fakeAuth({ status: 404 }));
    expect(await directory.getUserEmail('sb-1')).toBeNull();
  });

  it('throws on any other error, without the message', async () => {
    const directory = createSupabaseAdminDirectory(() => fakeAuth({ status: 500 }));
    const error: unknown = await directory.getUserEmail('sb-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(EMAIL);
  });
});

describe('createCachedEmailLookup', () => {
  function counting(impl: () => Promise<string | null>): AdminDirectory & { calls: number } {
    const directory = {
      calls: 0,
      getUserEmail() {
        directory.calls += 1;
        return impl();
      },
    };
    return directory;
  }

  it('serves a second call within the TTL without a lookup, and looks up again after it', async () => {
    let now = 1_000;
    const directory = counting(() => Promise.resolve(EMAIL));
    const lookup = createCachedEmailLookup(directory, { now: () => now });
    expect(await lookup('sb-1', request())).toBe(EMAIL);
    now += EMAIL_CACHE_TTL_MS - 1;
    expect(await lookup('sb-1', request())).toBe(EMAIL);
    expect(directory.calls).toBe(1);
    now += 2;
    await lookup('sb-1', request());
    expect(directory.calls).toBe(2);
  });

  it('caches a missing user as null', async () => {
    const directory = counting(() => Promise.resolve(null));
    const lookup = createCachedEmailLookup(directory);
    expect(await lookup('sb-gone', request())).toBeNull();
    expect(await lookup('sb-gone', request())).toBeNull();
    expect(directory.calls).toBe(1);
  });

  it('does not cache an error, returns null, and retries on the next call', async () => {
    let fail = true;
    const directory = counting(() =>
      fail ? Promise.reject(new TypeError(`fetch failed for ${EMAIL}`)) : Promise.resolve(EMAIL),
    );
    const lookup = createCachedEmailLookup(directory);
    expect(await lookup('sb-1', request())).toBeNull();
    fail = false;
    expect(await lookup('sb-1', request())).toBe(EMAIL);
    expect(directory.calls).toBe(2);
  });

  it('warns with the requestId and the error name only', async () => {
    const directory = counting(() => Promise.reject(new TypeError(`fetch failed for ${EMAIL}`)));
    const lookup = createCachedEmailLookup(directory);
    const req = request();
    await lookup('sb-secret-id', req);
    expect(req.log.warn).toHaveBeenCalledTimes(1);
    const [fields] = req.log.warn.mock.calls[0] as [Record<string, unknown>];
    expect(fields).toEqual({
      event: 'admin_email_lookup_failed',
      requestId: 'req-lookup-1',
      error: { name: 'TypeError' },
    });
    const logged = JSON.stringify(req.log.warn.mock.calls);
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain('sb-secret-id');
  });

  it('evicts the oldest entry at the cap', async () => {
    const directory = counting(() => Promise.resolve(EMAIL));
    const lookup = createCachedEmailLookup(directory, { maxEntries: 2 });
    await lookup('a', request());
    await lookup('b', request());
    await lookup('c', request());
    expect(directory.calls).toBe(3);
    await lookup('c', request());
    await lookup('b', request());
    expect(directory.calls).toBe(3);
    await lookup('a', request());
    expect(directory.calls).toBe(4);
  });
});
