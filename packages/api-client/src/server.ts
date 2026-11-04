// @packages/api-client/server — a React-free tRPC client for server code
// (Next.js Server Components, server actions, route handlers). The package
// index re-exports ApiProvider and the React hooks, so server code imports
// this subpath instead. Every call is uncached: responses are personalized.
import { createTRPCClient, httpLink } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '../../../apps/api/src/router/index.js';

export { getApiErrorCode } from './errors.js';
export type { AppRouter };

export interface ServerApiClientOptions {
  /** Full tRPC endpoint, e.g. `http://localhost:4000/trpc`. */
  url: string;
  /** The access token of the current server-side session, or null. */
  getToken: () => Promise<string | null>;
}

export function createServerApiClient({ url, getToken }: ServerApiClientOptions) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url,
        transformer: superjson,
        headers: async () => {
          const token = await getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      }),
    ],
  });
}

export type ServerApiClient = ReturnType<typeof createServerApiClient>;
