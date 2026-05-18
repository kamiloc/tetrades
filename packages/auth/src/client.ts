/**
 * Supabase auth client factory and platform-agnostic auth primitives.
 *
 * This module is consumed by both the Expo app and the Next.js app. It is
 * intentionally framework-free (no React, no react-native, no next imports)
 * so it can run anywhere that has `fetch`.
 *
 * Per CLAUDE.md / ADR-007:
 *   - Magic Link is primary, OTP is the fallback.
 *   - No email/password helpers are exposed.
 *   - Token storage / cookies are app-specific and injected via `storage` / cookies.
 */

import {
  createClient as createSupabaseClient,
  type Session,
  type SupabaseClient,
  type SupportedStorage,
  type User,
} from '@supabase/supabase-js';

export interface AuthClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Storage adapter. Expo passes an `expo-secure-store`-backed adapter;
   * web defaults to `localStorage` via supabase-js when omitted.
   */
  storage?: SupportedStorage;
  /** Override the default storage key (useful for multi-tenant scenarios). */
  storageKey?: string;
  /**
   * Whether the client should parse the URL fragment for a magic-link callback.
   * Defaults to `true`. Set to `false` on Expo where deep links are handled by
   * the app's linking layer.
   */
  detectSessionInUrl?: boolean;
}

export type AuthClient = SupabaseClient;
export type { Session, SupabaseClient, SupportedStorage, User };

/**
 * Create a Supabase auth client for browser or React Native runtimes.
 *
 * Uses PKCE flow with auto-refresh enabled; refresh-token rotation and reuse
 * detection are configured at the Supabase project level (ADR-007).
 */
export function createAuthClient(config: AuthClientConfig): AuthClient {
  return createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: config.detectSessionInUrl ?? true,
      storage: config.storage,
      storageKey: config.storageKey,
    },
  });
}

export interface SendMagicLinkParams {
  email: string;
  /** Optional redirect URL the magic link should land on (web app URL or Expo deep link). */
  emailRedirectTo?: string;
  /** Whether a new user should be created when no account exists. Defaults to `true`. */
  shouldCreateUser?: boolean;
}

/**
 * Send a Magic Link email. The same Supabase endpoint also emits a 6-digit OTP
 * code so the user can fall back to OTP entry if the link cannot be opened
 * (e.g., desktop email but mobile app).
 */
export async function sendMagicLink(
  client: AuthClient,
  params: SendMagicLinkParams,
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: params.email,
    options: {
      emailRedirectTo: params.emailRedirectTo,
      shouldCreateUser: params.shouldCreateUser ?? true,
    },
  });
  if (error) throw error;
}

export interface VerifyEmailOtpParams {
  email: string;
  /** The 6-digit code from the OTP email. */
  token: string;
}

/**
 * Verify an email OTP code (fallback flow when the magic link cannot be opened).
 * Returns the established session on success.
 */
export async function verifyEmailOtp(
  client: AuthClient,
  params: VerifyEmailOtpParams,
): Promise<Session> {
  const { data, error } = await client.auth.verifyOtp({
    email: params.email,
    token: params.token,
    type: 'email',
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('OTP verification succeeded but no session was returned');
  }
  return data.session;
}

/** Get the current session if one exists. Returns `null` when signed out. */
export async function getCurrentSession(client: AuthClient): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Sign out the current user. Clears the local session and revokes refresh tokens. */
export async function signOut(client: AuthClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
