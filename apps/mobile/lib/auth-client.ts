// Must come BEFORE any supabase-js import — installs crypto.subtle.digest
// and crypto.getRandomValues so PKCE uses S256.
import './crypto-polyfill';

import { createAuthClient, type AuthClient, type SupportedStorage } from '@packages/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRequiredEnv } from './env';

// Use AsyncStorage (not expo-secure-store) for the Supabase session blob.
// iOS Keychain has a 2 KB per-value limit; Supabase sessions (JWT + refresh
// token + user metadata) routinely exceed that, which causes setItem to
// throw silently and the session never persists across cold starts.
//
// The stored blob contains a short-lived access token and a rotating refresh
// token. No L2-CONFIDENTIAL data is held on-device. Device-level security
// (PIN / biometrics) is the primary protection layer for this storage.
//
// On Android, AsyncStorage is backed by SQLite and rejects NULL values
// ("the bind value at index 1 is null"). supabase-js occasionally calls
// setItem with undefined during cleanup — coerce those into removeItem.
// All three methods harden against null/undefined keys, which would otherwise
// reach AsyncStorage's SQLite binding on Android and throw
// "the bind value at index 1 is null". Silent no-op (instead of reject) so a
// stray bad call from supabase-js doesn't cascade into an auth failure.
function isValidKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length === 0) {
    if (__DEV__) {
      console.warn('[auth-storage] ignoring invalid key:', key);
    }
    return false;
  }
  return true;
}

const asyncStorageAdapter: SupportedStorage = {
  getItem: (key: string) => {
    if (!isValidKey(key)) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!isValidKey(key)) return Promise.resolve();
    if (value === null || value === undefined) {
      return AsyncStorage.removeItem(key);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!isValidKey(key)) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

const supabaseUrl = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const authClient: AuthClient = createAuthClient({
  supabaseUrl,
  supabaseAnonKey,
  storage: asyncStorageAdapter,
  detectSessionInUrl: false,
});
