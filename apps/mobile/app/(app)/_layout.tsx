import { useOnboardingState } from '@packages/api-client';
import { useSession } from '@packages/auth';
import FullScreenSpinner from 'apps/mobile/components/spinner';
import { Redirect, Stack, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function AppLayout() {
  const { isLoading: sessionLoading, isAuthenticated } = useSession();
  const onboardingState = useOnboardingState();
  const segments = useSegments();

  // expo-router's segments include route groups. For /onboarding (file at
  // app/(app)/onboarding.tsx) segments end in 'onboarding'; for any tabs
  // route it ends in the tab name. Comparing the leaf prevents the gate
  // below from looping on the screen it just redirected to.
  const onOnboardingRoute = segments[segments.length - 1] === 'onboarding';

  if (sessionLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (onboardingState.isLoading) {
    return <FullScreenSpinner />;
  }

  if (onboardingState.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-4">
        <Text className="text-body text-text text-center mb-4">
          No pudimos verificar tu perfil. Intenta de nuevo.
        </Text>
        <Pressable
          onPress={() => { void onboardingState.refetch(); }}
          className="bg-blue px-6 py-3 rounded-lg"
        >
          <Text className="text-paper font-semibold text-body">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const hasAthlete = onboardingState.data?.hasAthlete === true;

  if (!hasAthlete && !onOnboardingRoute) {
    return <Redirect href="/onboarding" />;
  }

  if (hasAthlete && onOnboardingRoute) {
    return <Redirect href="/profile" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: true,
          title: 'Bienvenido',
          headerTitleAlign: 'center',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="profile-edit"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Editar perfil',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          headerShown: true,
          title: 'Mis Logros',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
