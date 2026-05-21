import { trpc, useBootstrapAthlete, useSports } from '@packages/api-client';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../../lib/theme';

// Countries are kept short on purpose — expand the list once the product
// targets athletes outside LATAM. ISO-3166 alpha-2 codes.
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

function getSpanishError(message: string): string {
  if (message.includes('NOT_FOUND') || message.includes('Sport not available')) {
    return 'El deporte seleccionado no está disponible';
  }
  if (message.includes('Too many requests')) {
    return 'Demasiados intentos. Espera un momento';
  }
  return 'No se pudo crear el perfil. Intenta de nuevo';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const sportsQuery = useSports();
  const bootstrap = useBootstrapAthlete();

  const [displayName, setDisplayName] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    displayName.trim().length >= 2 && sportId !== null && countryCode !== null;
  const isSubmitting = bootstrap.isPending;

  const handleSubmit = async (): Promise<void> => {
    if (!isValid || isSubmitting || sportId === null || countryCode === null) {
      return;
    }
    setError(null);
    try {
      const result = await bootstrap.mutateAsync({
        displayName: displayName.trim(),
        sportId,
        countryCode,
      });
      // Write the new onboarding state directly into the query cache. This
      // avoids the redirect race that happens with `invalidateQueries()` —
      // the (app) layout re-reads this cache on every render, and if it sees
      // stale `hasAthlete=false` between mutation and refetch it bounces the
      // user back to /onboarding mid-navigation, corrupting the nav tree.
      utils.athlete.getOnboardingState.setData(undefined, {
        hasUserAccount: true,
        hasAthlete:     true,
        athleteId:      result.athleteId,
      });
      router.replace('/profile');
    } catch (err: unknown) {
      console.warn('[bootstrap] failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(getSpanishError(message));
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-14 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-title2 font-bold text-text mb-2">
          Crea tu perfil de atleta
        </Text>
        <Text className="text-body text-muted mb-8">
          Necesitamos algunos datos básicos para empezar.
        </Text>

        {/* Display name */}
        <Text className="text-footnote font-semibold text-text mb-2">
          Nombre público
        </Text>
        <TextInput
          className="bg-paper border border-line rounded-lg px-4 py-3 text-body text-text mb-6"
          placeholder="Ej. Daniela Pérez"
          placeholderTextColor={colors.subtle}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          editable={!isSubmitting}
          maxLength={100}
        />

        {/* Sport */}
        <Text className="text-footnote font-semibold text-text mb-2">
          Deporte principal
        </Text>
        {sportsQuery.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : sportsQuery.isError ? (
          <Pressable
            onPress={() => {
              void sportsQuery.refetch();
            }}
            className="py-3 px-4 bg-paper border border-line rounded-lg mb-6"
          >
            <Text className="text-body text-red-600">
              No pudimos cargar los deportes. Toca para reintentar.
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row flex-wrap gap-2 mb-6">
            {(sportsQuery.data ?? []).map(sport => {
              const selected = sport.id === sportId;
              return (
                <Pressable
                  key={sport.id}
                  onPress={() => setSportId(sport.id)}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-pill border ${selected ? 'bg-blue border-blue' : 'bg-paper border-line'}`}
                >
                  <Text
                    className={`text-body ${selected ? 'text-paper font-semibold' : 'text-text'}`}
                  >
                    {sport.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Country */}
        <Text className="text-footnote font-semibold text-text mb-2">País</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {COUNTRIES.map(country => {
            const selected = country.code === countryCode;
            return (
              <Pressable
                key={country.code}
                onPress={() => setCountryCode(country.code)}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-pill border ${selected ? 'bg-blue border-blue' : 'bg-paper border-line'}`}
              >
                <Text
                  className={`text-body ${selected ? 'text-paper font-semibold' : 'text-text'}`}
                >
                  {country.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error !== null ? (
          <Text className="text-body text-red-600 mb-4">{error}</Text>
        ) : null}

        <Pressable
          className={`items-center justify-center rounded-lg py-4 bg-blue ${!isValid || isSubmitting ? 'opacity-50' : ''}`}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Crear perfil"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text className="text-body-lg font-semibold text-on-ink">
              Crear perfil
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
