import '../global.css';

import { ApiProvider } from '@packages/api-client';
import { AuthProvider } from '@packages/auth';
import { Stack } from 'expo-router';
import { View } from 'react-native';


import { ToastProvider } from '../components/Toast';
import { authClient } from '../lib/auth-client';
import { getRequiredEnv } from '../lib/env';
import { getToken } from '../lib/get-token';
import { MobileLocalizationProvider, useMobileLocalization } from '../lib/i18n';
import { accessibilityLanguageFor } from '../lib/locale-selection';

const API_URL = getRequiredEnv('EXPO_PUBLIC_API_URL');

function LocalizedStack() {
  const { locale } = useMobileLocalization();
  return (
    <View accessibilityLanguage={accessibilityLanguageFor(locale)} style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <MobileLocalizationProvider>
      <AuthProvider client={authClient}>
        <ApiProvider apiUrl={API_URL} getToken={getToken}>
          <ToastProvider>
            <LocalizedStack />
          </ToastProvider>
        </ApiProvider>
      </AuthProvider>
    </MobileLocalizationProvider>
  );
}
