// Must come BEFORE any supabase-js import — installs crypto.subtle.digest
// so PKCE uses S256 instead of falling back to plain.
import './crypto-polyfill';

import { createAuthClient, type AuthClient, type SupportedStorage } from '@packages/auth';
import * as SecureStore from 'expo-secure-store';

import { getRequiredEnv } from './env';

// expo-secure-store only accepts keys matching /^[A-Za-z0-9._-]+$/.
// Supabase-js occasionally passes keys with other characters (and empty
// strings during cleanup paths), which throws. Map any unsafe character to
// '_' so the same input key always produces the same storage key.
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;
const sanitizeKey = (key: string): string | null => {
  if (!key) return null;
  if (SAFE_KEY.test(key)) return key;
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
};

const secureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => {
    const safe = sanitizeKey(key);
    if (!safe) return Promise.resolve(null);
    return SecureStore.getItemAsync(safe);
  },
  setItem: (key: string, value: string) => {
    const safe = sanitizeKey(key);
    if (!safe) return Promise.resolve();
    return SecureStore.setItemAsync(safe, value);
  },
  removeItem: (key: string) => {
    const safe = sanitizeKey(key);
    if (!safe) return Promise.resolve();
    return SecureStore.deleteItemAsync(safe);
  },
};

const supabaseUrl = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const authClient: AuthClient = createAuthClient({
  supabaseUrl,
  supabaseAnonKey,
  storage: secureStoreAdapter,
  detectSessionInUrl: false,
});
