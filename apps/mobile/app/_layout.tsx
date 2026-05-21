import '../global.css';

import { ApiProvider } from '@packages/api-client';
import { AuthProvider } from '@packages/auth';
import { Stack } from 'expo-router';

import { authClient } from '../lib/auth-client';
import { getRequiredEnv } from '../lib/env';
import { getToken } from '../lib/get-token';

const API_URL = getRequiredEnv('EXPO_PUBLIC_API_URL');

export default function RootLayout() {
  return (
    <AuthProvider client={authClient}>
      <ApiProvider apiUrl={API_URL} getToken={getToken}>
        <Stack screenOptions={{ headerShown: false }} />
      </ApiProvider>
    </AuthProvider>
  );
}
