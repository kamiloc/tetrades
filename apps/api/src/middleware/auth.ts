import { extractBearerToken } from '@packages/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthResult =
  | { authenticated: true; userId: string; supabaseUserId: string }
  | { authenticated: false; userId: null; supabaseUserId: null; errorCode?: string | number };

const UNAUTHENTICATED: AuthResult = {
  authenticated: false,
  userId: null,
  supabaseUserId: null,
};

// One service-role client per process, created lazily on first use.
// The service-role key lets auth.getUser() verify any user's JWT server-side.
// NEVER log this key — it is L3-RESTRICTED.
let _verifier: SupabaseClient | undefined;

function getVerifier(): SupabaseClient {
  if (_verifier) return _verifier;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
    );
  }

  _verifier = createClient(url, key, {
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
        supabaseUserId: null,
        // Status code only — never the message which may reference token segments.
        errorCode: error?.status ?? 'no_user',
      };
    }

    return {
      authenticated: true,
      userId: data.user.id,
      supabaseUserId: data.user.id,
    };
  } catch (err: unknown) {
    return {
      authenticated: false,
      userId: null,
      supabaseUserId: null,
      errorCode: err instanceof Error ? err.name : 'unknown_error',
    };
  }
}
