/**
 * @packages/auth — platform-agnostic Supabase auth wrapper.
 *
 * Per ADR-007 and CLAUDE.md:
 *   - Magic Link is primary; OTP is the fallback. No email/password.
 *   - Apps must consume this package — never call Supabase auth directly.
 *   - All server authorization derives from `verifyAccessToken` (trust boundary).
 *
 * React hooks (useAuth, useSession, etc.) are deferred to Sprint 2 task 2.7 and
 * will live in a future `./hooks.ts` module — they are NOT exported here.
 */

export {
  createAuthClient,
  getCurrentSession,
  sendMagicLink,
  signOut,
  verifyEmailOtp,
  type AuthClient,
  type AuthClientConfig,
  type SendMagicLinkParams,
  type Session,
  type SupabaseClient,
  type SupportedStorage,
  type User,
  type VerifyEmailOtpParams,
} from './client.js';

export {
  BEARER_PREFIX,
  createSsrServerClient,
  createTokenVerifier,
  extractBearerToken,
  verifyAccessToken,
  type CookieMethodsServer,
  type SsrServerClientConfig,
  type TokenVerifierConfig,
  type VerifiedUser,
} from './server.js';

export const AUTH_PACKAGE = '@packages/auth' as const;
