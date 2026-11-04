import { createServerApiClient, type ServerApiClient } from '@packages/api-client/server';

import { getApiTrpcUrl } from './api-origin';
import { createServerSupabase } from './supabase-server';

// The server-only path to the API (design D3): calls the API directly with
// the server session's token. Import it only from Server Components, server
// actions and route handlers; never from a 'use client' module.

export async function createServerApi(): Promise<ServerApiClient> {
  const supabase = await createServerSupabase();
  return createServerApiClient({
    url: getApiTrpcUrl(),
    getToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}

export { getApiErrorCode } from '@packages/api-client/server';
