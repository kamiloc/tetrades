import { createAuthClient, type AuthClient, type SupportedStorage } from '@packages/auth';
import * as SecureStore from 'expo-secure-store';

import { getRequiredEnv } from './env';

const secureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const authClient: AuthClient = createAuthClient({
  supabaseUrl,
  supabaseAnonKey,
  storage: secureStoreAdapter,
  detectSessionInUrl: false,
});
