import { createServerApiClient } from '@packages/api-client/server';
import type { SupabaseClient } from '@packages/auth/server';

import { getApiTrpcUrl } from './api-origin';
import { safeNext } from './safe-next';

// Sign-in steps behind the /login server actions and /auth/callback (design
// D1). Each takes the per-request Supabase client and the configured origin,
// so they never read Host or request.url.

export const ADMIN_LANDING = '/admin/clubs';
export const DEFAULT_LANDING = '/trainer';

export type SignInRequestResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid-email' | 'unavailable' };

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** The callback URL in the Magic Link, always on the configured origin. */
export function callbackUrl(appOrigin: string, next: unknown): string {
  const url = new URL('/auth/callback', appOrigin);
  const safe = safeNext(next, appOrigin);
  if (safe !== null) url.searchParams.set('next', safe);
  return url.toString();
}

/**
 * Send one email carrying both the Magic Link and the code. The result is the
 * same whether or not an account exists (shouldCreateUser), so the form can't
 * be used to probe accounts.
 */
export async function requestSignInWith(
  supabase: SupabaseClient,
  appOrigin: string,
  input: { email: unknown; next: unknown },
): Promise<SignInRequestResult> {
  const email = normalizeEmail(input.email);
  if (email === null) return { ok: false, reason: 'invalid-email' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(appOrigin, input.next), shouldCreateUser: true },
  });
  // A failure here is a rate limit or an outage, never "no such account".
  if (error) return { ok: false, reason: 'unavailable' };
  return { ok: true, email };
}

/** Verify the emailed code. Returns the new access token, or null when it's wrong or expired. */
export async function verifyCodeWith(
  supabase: SupabaseClient,
  input: { email: unknown; code: unknown },
): Promise<string | null> {
  const email = normalizeEmail(input.email);
  const code = typeof input.code === 'string' ? input.code.replace(/\s+/g, '') : '';
  if (email === null || !/^\d{6,10}$/.test(code)) return null;
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || data.session === null) return null;
  return data.session.access_token;
}

/** Whether the API recognizes this session as an admin (admin.whoAmI). */
export async function isAdminToken(accessToken: string): Promise<boolean> {
  const api = createServerApiClient({ url: getApiTrpcUrl(), getToken: async () => accessToken });
  try {
    await api.admin.whoAmI.query();
    return true;
  } catch {
    // FORBIDDEN is the normal answer for non-admins; any other failure also
    // falls back to the non-admin landing, which shows no admin data.
    return false;
  }
}

/** Where to go after sign-in: a safe `next`, else the account's default page. */
export async function chooseLanding(
  next: unknown,
  accessToken: string,
  appOrigin: string,
  isAdmin: (token: string) => Promise<boolean> = isAdminToken,
): Promise<string> {
  const safe = safeNext(next, appOrigin);
  if (safe !== null) return safe;
  return (await isAdmin(accessToken)) ? ADMIN_LANDING : DEFAULT_LANDING;
}
