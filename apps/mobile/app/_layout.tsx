import '../global.css';

import { ApiProvider } from '@packages/api-client';
import { AuthProvider } from '@packages/auth';
import { Stack } from 'expo-router';

import { authClient } from '../lib/auth-client';
import { getToken } from '../lib/get-token';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/trpc';

export default function RootLayout() {
  return (
    <AuthProvider client={authClient}>
      <ApiProvider apiUrl={API_URL} getToken={getToken}>
        <Stack screenOptions={{ headerShown: false }} />
      </ApiProvider>
    </AuthProvider>
  );
}
