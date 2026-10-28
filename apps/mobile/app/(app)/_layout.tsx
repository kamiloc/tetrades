import { useOnboardingState } from '@packages/api-client';
import { useSession } from '@packages/auth';
import { Redirect, Stack, useSegments } from 'expo-router';
import { View } from 'react-native';

import FullScreenSpinner from '../../components/spinner';
import { StatePanel } from '../../components/StatePanel';
import { isBusy, isFailed } from '../../lib/query-state';

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

  if (isBusy(onboardingState)) {
    return <FullScreenSpinner />;
  }

  if (isFailed(onboardingState)) {
    return (
      <View className="flex-1 justify-center bg-canvas px-4">
        <StatePanel
          tone="danger"
          icon="alert-circle"
          title="Couldn't check your profile"
          body="Check your connection and try again."
          primary={{ label: 'Try again', onPress: () => { void onboardingState.refetch(); } }}
        />
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
      <Stack.Screen name="search" />
      <Stack.Screen name="visibility" />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: true,
          title: 'Welcome',
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
          title: 'Edit profile',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          headerShown: true,
          title: 'Achievements',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
