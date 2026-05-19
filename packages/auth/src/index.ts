/**
 * @packages/auth — platform-agnostic Supabase auth wrapper.
 *
 * Per ADR-007 and CLAUDE.md:
 *   - Magic Link is primary; OTP is the fallback. No email/password.
 *   - Apps must consume this package — never call Supabase auth directly.
 *   - All server authorization derives from `verifyAccessToken` (trust boundary).
 *   - Only `./hooks.ts` may import from `react`. All other modules are pure TS.
 */

export {
  createAuthClient,
  createSupabaseClient,
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
  verifyToken,
  type CookieMethodsServer,
  type SsrServerClientConfig,
  type TokenVerifierConfig,
  type VerifiedUser,
} from './server.js';

export {
  AuthProvider,
  useAuth,
  useSession,
  useSignIn,
  useSignOut,
  type AuthContextValue,
  type AuthProviderProps,
  type UseSessionResult,
  type UseSignInResult,
  type UseSignOutResult,
} from './hooks.js';

export const AUTH_PACKAGE = '@packages/auth' as const;
