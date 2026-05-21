import { useSession } from '@packages/auth';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

// The layout now ONLY gates on auth — onboarding routing happens at the
// screen level (profile redirects to /onboarding if myAthleteQuery returns
// NOT_FOUND). This keeps the Stack stable across query refetches; previously
// `useOnboardingState` in the layout caused `Stack.Protected` guards to flip
// when shared query state changed, tearing down the navigator while children
// were mid-render and producing "Couldn't find a navigation context".
export default function AppLayout() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
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
