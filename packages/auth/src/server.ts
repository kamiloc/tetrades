/**
 * Server-side auth utilities for the Fastify API and Next.js SSR.
 *
 * - `verifyAccessToken` is the trust boundary for the API: every protected
 *   tRPC procedure derives `ctx.userId` from this verification. Per CLAUDE.md,
 *   client-supplied user IDs are never trusted — only the verified JWT.
 * - `createSsrServerClient` wraps `@supabase/ssr` so the Next.js app can
 *   read/write the auth cookie without depending on Supabase directly.
 */

import {
  createServerClient as createSupabaseServerClient,
  type CookieMethodsServer,
} from '@supabase/ssr';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

export const BEARER_PREFIX = 'Bearer ';

export interface TokenVerifierConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Token verifier that does not persist sessions or refresh tokens. The
 * returned client is reusable — instantiate once at server startup and pass
 * it to `verifyAccessToken` on every request.
 */
export function createTokenVerifier(config: TokenVerifierConfig): SupabaseClient {
  return createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export interface VerifiedUser {
  userId: string;
  email: string | null;
}

/**
 * Verify a Supabase access token (JWT) by calling `auth.getUser` with the
 * token. Throws on missing, malformed, or expired tokens.
 *
 * The returned `userId` corresponds to `auth.users.id` in Supabase and is
 * what callers should store on the tRPC context as `ctx.userId`.
 */
export async function verifyAccessToken(
  verifier: SupabaseClient,
  accessToken: string,
): Promise<VerifiedUser> {
  if (accessToken.trim().length === 0) {
    throw new Error('verifyAccessToken: access token is empty');
  }
  const { data, error } = await verifier.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Invalid or expired access token');
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
  };
}

/**
 * Extract the bearer token from an `Authorization` header value.
 * Returns `null` when the header is missing, the scheme is wrong, or the
 * token portion is empty.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith(BEARER_PREFIX)) return null;
  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export interface SsrServerClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Cookie methods provided by the framework (Next.js `cookies()` for App Router).
   * Use `getAll`/`setAll` per `@supabase/ssr` >= 0.4.
   */
  cookies: CookieMethodsServer;
}

/**
 * Cookie-aware Supabase client for Next.js Server Components / Route Handlers.
 * Used to read the session during SSR so server-rendered pages can know the
 * current user without trusting client-supplied data.
 */
export function createSsrServerClient(config: SsrServerClientConfig): SupabaseClient {
  return createSupabaseServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: config.cookies,
  });
}

export type { CookieMethodsServer, SupabaseClient };
