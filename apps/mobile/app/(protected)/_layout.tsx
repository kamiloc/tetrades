import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { getToken } from '../../lib/get-token';

export default function ProtectedLayout() {
  const router = useRouter();

  useEffect(() => {
    void getToken().then((token) => {
      if (token === null) {
        router.replace('/(auth)/login');
      }
    });
  }, [router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
