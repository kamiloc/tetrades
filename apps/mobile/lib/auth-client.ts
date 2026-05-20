import { createAuthClient, type AuthClient, type SupportedStorage } from '@packages/auth';
import * as SecureStore from 'expo-secure-store';

const secureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

if (supabaseUrl === '' || supabaseAnonKey === '') {
  throw new Error(
    'Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY',
  );
}

export const authClient: AuthClient = createAuthClient({
  supabaseUrl,
  supabaseAnonKey,
  storage: secureStoreAdapter,
  detectSessionInUrl: false,
});
