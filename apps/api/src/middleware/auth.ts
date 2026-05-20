import {
  createTokenVerifier,
  extractBearerToken,
  verifyAccessToken,
  type SupabaseClient,
} from '@packages/auth';

import { getEnv } from '../env.js';

export type AuthResult =
  | { authenticated: true; userId: string }
  | { authenticated: false; userId: null; errorCode?: string | number };

const UNAUTHENTICATED: AuthResult = {
  authenticated: false,
  userId: null,
  errorCode: undefined,
};

// One verifier client per process, created lazily on first use.
let _verifier: SupabaseClient | undefined;

function getVerifier(): SupabaseClient {
  if (_verifier) return _verifier;

  const env = getEnv();

  _verifier = createTokenVerifier({
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
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
    const user = await verifyAccessToken(getVerifier(), token);

    return {
      authenticated: true,
      userId: user.userId,
    };
  } catch (err: unknown) {
    return {
      authenticated: false,
      userId: null,
      errorCode: err instanceof Error ? err.name : 'unknown_error',
    };
  }
}
