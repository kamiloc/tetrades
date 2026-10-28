// User-facing copy for Supabase auth errors on the sign-in screens.
export function authErrorMessage(message: string): string {
  if (message.includes('Too many requests') || message.includes('Email rate limit exceeded')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (message.includes('Token has expired') || message.includes('token is invalid')) {
    return 'That code expired or is invalid. Request a new one.';
  }
  return "Couldn't sign you in. Try again.";
}
