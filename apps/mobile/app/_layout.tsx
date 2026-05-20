import '../global.css';

import { ApiProvider } from '@packages/api-client';
import { AuthProvider } from '@packages/auth';
import { Slot } from 'expo-router';

import { authClient } from '../lib/auth-client';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/trpc';

async function getToken(): Promise<string | null> {
  const { data } = await authClient.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function RootLayout() {
  return (
    <AuthProvider client={authClient}>
      <ApiProvider apiUrl={API_URL} getToken={getToken}>
        <Slot />
      </ApiProvider>
    </AuthProvider>
  );
}
