import { trpc, useMyAthlete } from '@packages/api-client';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getInitials(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[1]?.[0] ?? '') : '';
  const result = (first + second).toUpperCase();
  return result.length > 0 ? result : '?';
}

export default function ProfileScreen() {
  const router = useRouter();

  // STEP A: Resolve athlete identity
  const myAthleteQuery = useMyAthlete();
  const athleteId = myAthleteQuery.data?.athleteId;

  // STEP B: Fetch full profile (enabled only when athleteId is known)
  const profileQuery = trpc.athlete.getProfile.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );

  // STEP C: Fetch achievements (enabled only when athleteId is known)
  const achievementsQuery = trpc.achievement.listAchievements.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );

  // STEP D: Fetch connections (enabled only when athleteId is known)
  const connectionsQuery = trpc.connection.listConnections.useQuery(
    { athleteId: athleteId ?? '' },
    { enabled: !!athleteId },
  );

  const isIdentityLoading = myAthleteQuery.isLoading;
  const profile = profileQuery.data ?? null;
  const achievements = achievementsQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];
  const displayName = myAthleteQuery.data?.displayName ?? null;
  const sport = myAthleteQuery.data?.sport ?? null;

  // Full-screen error — identity is the critical path; without it nothing else loads
  if (myAthleteQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-4">
        <Text className="text-text text-body text-center">
          No pudimos cargar tu perfil. Intenta de nuevo.
        </Text>
        <Pressable
          onPress={() => { void myAthleteQuery.refetch(); }}
          className="mt-4 bg-blue px-6 py-3 rounded-lg"
        >
          <Text className="text-paper font-semibold text-body">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // Profile completion derived from available data
  const completionItems = [
    { label: 'Foto de perfil', done: false },
    { label: 'Biografía', done: profile?.onboardingStatus === 'COMPLETE' },
    { label: 'Deporte', done: !!sport },
    { label: 'Documentos', done: false },
  ];
  
  const pct = Math.round(
    (completionItems.filter(i => i.done).length / completionItems.length) * 100,
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-8"
    >
      {/* ── SECTION 1 — HEADER CARD ─────────────────────────────────── */}
      <View className="bg-ink rounded-b-2xl">
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4 pb-6">
            {/* Edit button — top right */}
            <View className="flex-row justify-end mb-3">
              <Pressable
                onPress={() => { router.push('/profile-edit'); }}
              >
                <Text className="text-blue text-body font-medium">Editar</Text>
              </Pressable>
            </View>

            {/* Avatar + identity — skeleton while identity resolves */}
            {isIdentityLoading ? (
              <View className="items-center">
                <View className="h-24 w-24 rounded-pill bg-header-chip-bg animate-pulse" />
                <View className="h-5 w-40 rounded-xs bg-header-chip-bg animate-pulse mt-3" />
                <View className="h-4 w-24 rounded-pill bg-header-chip-bg animate-pulse mt-2" />
              </View>
            ) : (
              <View className="items-center">
                {/* Avatar circle with initials */}
                <View className="bg-blue rounded-pill w-20 h-20 items-center justify-center">
                  <Text className="text-paper font-bold text-title2">
                    {getInitials(displayName)}
                  </Text>
                </View>
                {/* Display name */}
                <Text className="text-title3 font-bold text-on-ink mt-3">
                  {displayName ?? 'Tu perfil'}
                </Text>
                {/* Sport badge — only when sport is known */}
                {sport !== null ? (
                  <View className="bg-header-chip-bg border border-header-chip-border rounded-pill px-3 py-1 mt-2 self-start">
                    <Text className="text-on-ink text-small font-medium">{sport}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* ── SECTION 2 — STATS ROW ───────────────────────────────────── */}
      <View className="flex-row bg-paper mx-4 mt-4 rounded-xl">
        {/* Altura */}
        <View className="flex-1 items-center py-4 border-r border-line">
          {profileQuery.isLoading ? (
            <View className="h-7 w-16 rounded-sm bg-canvas animate-pulse" />
          ) : (
            <Text className="text-callout font-bold text-text">—</Text>
          )}
          <Text className="text-caption text-muted mt-1">Altura</Text>
        </View>
        {/* Peso */}
        <View className="flex-1 items-center py-4 border-r border-line">
          {profileQuery.isLoading ? (
            <View className="h-7 w-16 rounded-sm bg-canvas animate-pulse" />
          ) : (
            <Text className="text-callout font-bold text-text">—</Text>
          )}
          <Text className="text-caption text-muted mt-1">Peso</Text>
        </View>
        {/* Conexiones */}
        <View className="flex-1 items-center py-4">
          {connectionsQuery.isLoading ? (
            <View className="h-7 w-16 rounded-sm bg-canvas animate-pulse" />
          ) : (
            <Text className="text-callout font-bold text-text">
              {String(connections.length)}
            </Text>
          )}
          <Text className="text-caption text-muted mt-1">Conexiones</Text>
        </View>
      </View>

      {/* ── SECTION 3 — PROFILE COMPLETION CARD ─────────────────────── */}
      <View className="bg-paper rounded-xl mx-4 mt-4 p-4">
        {profileQuery.isLoading ? (
          <>
            <View className="h-5 w-48 rounded-xs bg-canvas animate-pulse" />
            <View className="h-2 rounded-pill bg-canvas animate-pulse mt-3 mb-4" />
            {[0, 1, 2, 3].map(n => (
              <View key={n} className="h-4 w-full rounded-xs bg-canvas animate-pulse mt-2" />
            ))}
          </>
        ) : (
          <>
            {/* Header row */}
            <View className="flex-row items-center justify-between">
              <Text className="text-body font-semibold text-text">Completa tu perfil</Text>
              <Text className="text-blue font-bold text-body">{pct}%</Text>
            </View>
            {/* Progress bar — width is the only permitted inline style here */}
            <View className="h-2 bg-line rounded-pill mt-3 mb-4">
              <View
                className="h-2 bg-blue rounded-pill"
                style={{ width: `${pct}%` }}
              />
            </View>
            {/* Completion item rows */}
            {completionItems.map(item => (
              <View key={item.label} className="flex-row items-center py-1">
                {item.done ? (
                  <Text className="text-blue font-bold w-5">✓</Text>
                ) : (
                  <Text className="text-muted w-5">○</Text>
                )}
                <Text className={item.done ? 'text-text text-body' : 'text-muted text-body'}>
                  {item.label}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/* ── SECTION 4 — ACHIEVEMENTS PREVIEW ────────────────────────── */}
      <View className="mx-4 mt-4">
        {/* Section header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-body font-semibold text-text">Logros</Text>
          <Pressable
            onPress={() => router.push('/achievements')}
          >
            <Text className="text-blue text-body">Ver todos</Text>
          </Pressable>
        </View>

        {achievementsQuery.isLoading ? (
          <>
            <View className="bg-paper rounded-xl p-4 mb-3 h-16 animate-pulse" />
            <View className="bg-paper rounded-xl p-4 mb-3 h-16 animate-pulse" />
          </>
        ) : achievements.length === 0 ? (
          <View className="items-center py-6">
            <Text className="text-muted text-body text-center">
              Aún no tienes logros registrados
            </Text>
          </View>
        ) : (
          achievements.slice(0, 3).map(item => (
            <View key={item.id} className="bg-paper rounded-xl p-4 mb-3">
              {/* Row 1: title + badge */}
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-body font-semibold text-text flex-1 mr-2"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.verificationStatus === 'VERIFIED' ? (
                  <View className="bg-blue-tint rounded-pill px-2 py-0.5">
                    <Text className="text-blue text-caption font-medium">Verificado</Text>
                  </View>
                ) : item.verificationStatus === 'REJECTED' ? (
                  <View className="bg-red-100 rounded-pill px-2 py-0.5">
                    <Text className="text-red-600 text-caption font-medium">Rechazado</Text>
                  </View>
                ) : (
                  <View className="bg-pending-tint rounded-pill px-2 py-0.5">
                    <Text className="text-pending text-caption font-medium">Pendiente</Text>
                  </View>
                )}
              </View>
              {/* Row 2: organization */}
              <Text className="text-muted text-caption mt-1">{item.organization}</Text>
              {/* Row 3: date */}
              <Text className="text-muted text-caption mt-0.5">
                {item.achievedOn.toLocaleDateString('es-CO')}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── SECTION 5 — CONNECTIONS PREVIEW ─────────────────────────── */}
      <View className="mx-4 mt-4">
        {/* Section header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-body font-semibold text-text">Conexiones</Text>
          <Pressable
            onPress={() => {
              // TODO(5.9): router.push('/(tabs)/connections')
            }}
          >
            <Text className="text-blue text-body">Ver todas</Text>
          </Pressable>
        </View>

        {connectionsQuery.isLoading ? (
          <View className="flex-row gap-3">
            {[0, 1, 2].map(n => (
              <View key={n} className="items-center">
                <View className="w-12 h-12 rounded-pill bg-canvas animate-pulse" />
                <View className="h-3 w-12 rounded-xs bg-canvas animate-pulse mt-1" />
              </View>
            ))}
          </View>
        ) : connections.length === 0 ? (
          <View className="items-center py-4">
            <Text className="text-muted text-body text-center">
              Aún no tienes conexiones
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-1"
          >
            {connections.slice(0, 5).map(conn => (
              <View key={conn.id} className="items-center">
                <View className="w-12 h-12 rounded-pill bg-blue-tint items-center justify-center">
                  <Text className="text-blue text-body font-medium">?</Text>
                </View>
                {/* maxWidth inline style — the only permitted second inline style */}
                <Text
                  className="text-caption text-muted text-center mt-1"
                  numberOfLines={1}
                  style={{ maxWidth: 60 }}
                >
                  Conexión
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}
