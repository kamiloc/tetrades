'use server';

import { redirect } from 'next/navigation';

import { getAppOrigin } from '../../lib/app-origin';
import { chooseLanding, requestSignInWith, verifyCodeWith } from '../../lib/auth-flow';
import { safeNext } from '../../lib/safe-next';
import { createServerSupabase } from '../../lib/supabase-server';

// Sign-in server actions (design D1). Every Supabase auth call runs here, on
// the server, so the session only ever lives in httpOnly cookies.

export type LoginState =
  | { step: 'email'; email: string; next: string; error?: 'invalid-email' | 'unavailable' }
  | {
      step: 'code';
      email: string;
      next: string;
      error?: 'invalid-code' | 'unavailable';
      resent?: boolean;
    };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function requestSignIn(previous: LoginState, formData: FormData): Promise<LoginState> {
  const appOrigin = getAppOrigin();
  const next = safeNext(field(formData, 'next'), appOrigin) ?? '';
  const supabase = await createServerSupabase();
  const result = await requestSignInWith(supabase, appOrigin, {
    email: field(formData, 'email'),
    next,
  });
  if (!result.ok) {
    if (previous.step === 'code' && result.reason === 'unavailable') {
      return { ...previous, error: 'unavailable', resent: false };
    }
    return { step: 'email', email: field(formData, 'email'), next, error: result.reason };
  }
  return { step: 'code', email: result.email, next, resent: previous.step === 'code' };
}

export async function verifyCode(previous: LoginState, formData: FormData): Promise<LoginState> {
  const appOrigin = getAppOrigin();
  const next = safeNext(field(formData, 'next'), appOrigin) ?? '';
  const email = field(formData, 'email');
  const supabase = await createServerSupabase();
  const accessToken = await verifyCodeWith(supabase, { email, code: field(formData, 'code') });
  if (accessToken === null) {
    return { step: 'code', email: previous.email || email, next, error: 'invalid-code' };
  }
  redirect(await chooseLanding(next, accessToken, appOrigin));
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  // Clears the session cookies even if the revoke call fails.
  await supabase.auth.signOut();
  redirect('/login');
}
