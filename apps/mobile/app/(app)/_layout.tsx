import { Stack } from 'expo-router';

// This layout intentionally has ZERO conditional returns. It always renders
// the Stack with the same screen declarations on every render — the
// navigation tree is therefore stable from first mount, never tearing down
// child screens mid-render.
//
// Auth gating happens at the entry points:
//   - app/index.tsx redirects unauthenticated users to /login
//   - the (auth) group is unprotected and accessible to anyone
//   - tRPC procedures throw UNAUTHORIZED if hit without a valid token, so
//     even a deep-link into an (app) route is safe at the data layer
//
// Onboarding gating (no Athlete row) happens at the screen level — see
// the useEffect in (tabs)/profile.tsx that redirects to /onboarding when
// myAthleteQuery returns NOT_FOUND.
//
// Previous versions of this file conditionally returned <View>, <Redirect>,
// or <Stack.Protected>, which produced intermittent
// "Couldn't find a navigation context" errors as the navigation tree
// rebuilt itself mid-render.
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
