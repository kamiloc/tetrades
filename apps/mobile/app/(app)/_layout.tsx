import { Stack } from 'expo-router';

export default function AppLayout() {

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
