import {
  createSsrServerClient,
  type CookieMethodsServer,
  type SupabaseClient,
} from '@packages/auth/server';
import { cookies } from 'next/headers';

import { getAppOrigin } from './app-origin';

// Every Supabase auth call in the web app runs on the server (design D1), so
// the session lives only in httpOnly cookies and browser scripts never see a
// token. One factory forces the cookie policy for server actions, route
// handlers, middleware and the proxy.

type SetAllCookies = NonNullable<CookieMethodsServer['setAll']>;
export type CookieToSet = Parameters<SetAllCookies>[0][number];
export type CookieOptions = CookieToSet['options'];

export interface CookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: CookieToSet[]) => void;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Force the session cookie policy, keeping Supabase's names and max-age. */
export function forceCookieOptions(options: CookieOptions, appOrigin: string): CookieOptions {
  const { hostname } = new URL(appOrigin);
  return {
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !LOCAL_HOSTS.has(hostname),
  };
}

function readSupabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  }
  return { supabaseUrl, supabaseAnonKey };
}

/** A per-request Supabase client over any cookie store, with forced options. */
export function createSupabaseWithCookies(adapter: CookieAdapter): SupabaseClient {
  const appOrigin = getAppOrigin();
  return createSsrServerClient({
    ...readSupabaseEnv(),
    cookies: {
      getAll: () => adapter.getAll(),
      setAll: (toSet) => {
        adapter.setAll(
          toSet.map(({ name, value, options }) => ({
            name,
            value,
            options: forceCookieOptions(options, appOrigin),
          })),
        );
      },
    },
  });
}

/**
 * Supabase client for Server Components, server actions and route handlers,
 * over Next's request cookies. Server Components can't write cookies; there
 * the write is skipped and middleware persists any refresh instead.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const store = await cookies();
  return createSupabaseWithCookies({
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (toSet) => {
      try {
        for (const { name, value, options } of toSet) store.set(name, value, options);
      } catch {
        // Called from a Server Component: cookies are read-only there.
      }
    },
  });
}
