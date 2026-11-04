import { getAppOrigin } from './app-origin';

// Return targets after sign-in (design D2). Only a same-origin relative path
// is accepted; anything else returns null and the caller picks the default
// landing for the account. Used by the login form, the callback and middleware.

const MAX_LENGTH = 2048;
// C0 controls, DEL and C1 controls.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

export function safeNext(value: unknown, appOrigin: string = getAppOrigin()): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('\\') || CONTROL_CHARS.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, appOrigin);
  } catch {
    return null;
  }
  if (url.origin !== appOrigin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
