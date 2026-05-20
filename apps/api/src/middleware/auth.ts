import { extractBearerToken } from '@packages/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '../env.js';

export type AuthResult =
  | { authenticated: true; userId: string }
  | { authenticated: false; userId: null; errorCode?: string | number };

const UNAUTHENTICATED: AuthResult = {
  authenticated: false,
  userId: null,
  errorCode: undefined,
};

// One Supabase client per process, created lazily on first use.
// Uses the anon key to call auth.getUser() for JWT verification.
let _verifier: SupabaseClient | undefined;

function getVerifier(): SupabaseClient {
  if (_verifier) return _verifier;

  const env = getEnv();

  _verifier = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _verifier;
}

/** Exposed for unit testing only — injects a mock Supabase client. */
export function _setVerifierForTest(client: SupabaseClient | undefined): void {
  _verifier = client;
}

/**
 * Verify a Supabase JWT extracted from an Authorization header.
 *
 * Returns a discriminated AuthResult — callers never throw. The `errorCode`
 * field on the unauthenticated variant carries the Supabase HTTP status (or
 * a string tag) for the caller to log; it contains NO token fragments.
 *
 * Logging is the caller's responsibility — this function has no logger.
 * NEVER pass or log the raw Authorization header or token value.
 */
export async function verifyAuthToken(
  authHeader: string | undefined,
): Promise<AuthResult> {
  const token = extractBearerToken(authHeader);

  if (token === null) {
    return UNAUTHENTICATED;
  }

  try {
    const { data, error } = await getVerifier().auth.getUser(token);

    if (error !== null || !data.user) {
      return {
        authenticated: false,
        userId: null,
        // Status code only — never the message which may reference token segments.
        errorCode: error?.status ?? 'no_user',
      };
    }

    return {
      authenticated: true,
      userId: data.user.id,
    };
  } catch (err: unknown) {
    return {
      authenticated: false,
      userId: null,
      errorCode: err instanceof Error ? err.name : 'unknown_error',
    };
  }
}
