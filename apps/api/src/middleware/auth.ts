import {
  createTokenVerifier,
  extractBearerToken,
  verifyAccessToken,
  type SupabaseClient,
} from '@packages/auth';

import { getEnv } from '../env.js';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Verified once per request by the rate-limit onRequest hook
     * (middleware/rateLimit.ts); reused by createContext. Declared here so
     * every TS program that includes context.ts (e.g. the Next.js build,
     * which imports the AppRouter type) sees the augmentation.
     */
    authResult?: AuthResult;
  }
}

export type AuthResult =
  | {
      authenticated: true;
      userId: string;
      /**
       * `UserAccount.role`, resolved by the rate-limit onRequest hook via a
       * TTL-cached lookup (lib/userRole.ts). Used ONLY for tier-based rate
       * limiting (SYSTEM → admin tier, see rateLimit.ts ADMIN_ROLES) — never
       * for authorization decisions. Absent when resolution failed or the
       * request bypassed the hook.
       */
      role?: string;
    }
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
      errorCode: extractHttpStatus(err) ?? (err instanceof Error ? err.name : 'unknown_error'),
    };
  }
}

/**
 * Numeric Supabase HTTP status attached by verifyAccessToken, when present.
 * Never returns message text — only the status number (no token fragments).
 */
function extractHttpStatus(err: unknown): number | undefined {
  if (err instanceof Error && 'status' in err) {
    const status = (err as Error & { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}
