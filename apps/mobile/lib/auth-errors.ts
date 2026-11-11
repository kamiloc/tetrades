import type { AppLocale } from './locale-selection';
import { translate } from './translations';

// User-facing copy for Supabase auth errors on the sign-in screens.
export function authErrorMessage(message: string, locale: AppLocale): string {
  if (message.includes('Too many requests') || message.includes('Email rate limit exceeded')) {
    return translate(locale, 'auth.tooManyRequests');
  }
  if (message.includes('Token has expired') || message.includes('token is invalid')) {
    return translate(locale, 'auth.codeExpired');
  }
  return translate(locale, 'auth.signInFailed');
}
