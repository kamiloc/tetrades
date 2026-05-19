/**
 * React hooks for Supabase auth.
 *
 * Per CLAUDE.md / ADR-007:
 *   - This is the ONLY file in @packages/auth that may import from `react`.
 *   - NEVER import from `react-native`, `expo-*`, `next`, or `react-dom`.
 *     The hooks rely only on React core APIs so they work on both Expo and
 *     Next.js without a cross-platform UI bridge.
 *   - Magic Link is primary; OTP is the fallback. No email/password helpers.
 *   - Token persistence is handled internally by the Supabase SDK (Secure
 *     Store on Expo, httpOnly cookies on Next.js via @supabase/ssr).
 *
 * The hooks consume a `SupabaseClient` injected by the app via `AuthProvider`,
 * so this package doesn't need to know how the client was created.
 */

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  client: SupabaseClient;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: SupabaseClient;
  children: ReactNode;
}

/**
 * Headless context provider — renders no UI. Mount once near the app root and
 * pass it a configured Supabase client (Expo: secure-store backed; Next.js:
 * cookie backed via @supabase/ssr).
 */
export function AuthProvider({ client, children }: AuthProviderProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void client.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        // Treat any restore failure as signed-out — never throw out of the effect.
        setSession(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const value: AuthContextValue = {
    client,
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: session !== null,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ──────────────────────────────────────────────────────────────────────────────
// useSignIn — Magic Link primary, OTP fallback
// ──────────────────────────────────────────────────────────────────────────────

export interface UseSignInResult {
  signInWithMagicLink: (
    email: string,
    redirectTo?: string,
  ) => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  isLoading: boolean;
  error: string | null;
}

export function useSignIn(): UseSignInResult {
  const { client } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithMagicLink = useCallback(
    async (email: string, redirectTo?: string) => {
      setIsLoading(true);
      setError(null);
      const { error: signInError } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      setIsLoading(false);
      const message = signInError?.message ?? null;
      if (message !== null) setError(message);
      return { error: message };
    },
    [client],
  );

  const signInWithOtp = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      const { error: signInError } = await client.auth.signInWithOtp({ email });
      setIsLoading(false);
      const message = signInError?.message ?? null;
      if (message !== null) setError(message);
      return { error: message };
    },
    [client],
  );

  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      setIsLoading(true);
      setError(null);
      const { error: verifyError } = await client.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      setIsLoading(false);
      const message = verifyError?.message ?? null;
      if (message !== null) setError(message);
      return { error: message };
    },
    [client],
  );

  return { signInWithMagicLink, signInWithOtp, verifyOtp, isLoading, error };
}

// ──────────────────────────────────────────────────────────────────────────────
// useSignOut
// ──────────────────────────────────────────────────────────────────────────────

export interface UseSignOutResult {
  signOut: () => Promise<{ error: string | null }>;
  isLoading: boolean;
}

export function useSignOut(): UseSignOutResult {
  const { client } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const { error: signOutError } = await client.auth.signOut();
    setIsLoading(false);
    return { error: signOutError?.message ?? null };
  }, [client]);

  return { signOut, isLoading };
}

// ──────────────────────────────────────────────────────────────────────────────
// useSession — read-only convenience hook
// ──────────────────────────────────────────────────────────────────────────────

export interface UseSessionResult {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useSession(): UseSessionResult {
  const { session, user, isLoading, isAuthenticated } = useAuth();
  return { session, user, isLoading, isAuthenticated };
}
