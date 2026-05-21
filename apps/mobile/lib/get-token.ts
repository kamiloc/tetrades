// Module-scope access-token cache.
//
// We intentionally do NOT call `authClient.auth.getSession()` per request.
// On supabase-js@2.106 with asymmetric (ES256) JWTs, getSession() can
// return { session: null } transiently while internal JWKS verification
// runs in the background — even when the session is restored and
// `onAuthStateChange` already fired with the real session.
//
// Instead we listen to `onAuthStateChange` (the authoritative event stream)
// and keep `currentAccessToken` in sync. `getToken()` becomes a near-instant
// lookup of the cached value.
//
// Lifecycle:
//   - On module load we kick off `getSession()` once to seed the cache for the
//     case where the app starts with a restored session. If it returns null,
//     no problem — the auth-state listener will catch it when the session is
//     actually emitted.
//   - SIGNED_IN / TOKEN_REFRESHED → cache updated to the new token
//   - SIGNED_OUT / USER_UPDATED-with-null → cache cleared

import { authClient } from './auth-client';

let currentAccessToken: string | null = null;

const initialRestore = authClient.auth
  .getSession()
  .then(({ data }) => {
    if (data.session?.access_token) {
      currentAccessToken = data.session.access_token;
    }
  })
  .catch(() => {
    // Treat any restore failure as no token; the auth-state listener
    // will still fire if a session is established later.
  });

authClient.auth.onAuthStateChange((_event, session) => {
  currentAccessToken = session?.access_token ?? null;
});

export async function getToken(): Promise<string | null> {
  // Wait for the initial restore so the very first tRPC request after a
  // cold start doesn't fire without a token.
  await initialRestore;
  return currentAccessToken;
}
