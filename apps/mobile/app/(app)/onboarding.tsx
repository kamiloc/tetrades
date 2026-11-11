import { trpc, useBootstrapAthlete, useSports } from '@packages/api-client';
import { TRAINER_ACCOUNT_ONBOARDING_MESSAGE } from '@packages/shared-logic';
import { TRPCClientError } from '@trpc/client';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { useMobileLocalization } from '../../lib/i18n';
import { colors } from '../../lib/theme';
import type { MessageKey } from '../../lib/translations';

// Countries are kept short on purpose — expand the list once the product
// targets athletes outside LATAM. ISO-3166 alpha-2 codes.
const COUNTRIES: { code: string; en: string; es: string }[] = [
  { code: 'CO', en: 'Colombia', es: 'Colombia' },
  { code: 'MX', en: 'Mexico', es: 'México' },
  { code: 'AR', en: 'Argentina', es: 'Argentina' },
  { code: 'CL', en: 'Chile', es: 'Chile' },
  { code: 'PE', en: 'Peru', es: 'Perú' },
  { code: 'EC', en: 'Ecuador', es: 'Ecuador' },
  { code: 'BR', en: 'Brazil', es: 'Brasil' },
  { code: 'ES', en: 'Spain', es: 'España' },
  { code: 'US', en: 'United States', es: 'Estados Unidos' },
];

// One capacity per account (ADR-017): athlete.bootstrap answers FORBIDDEN for
// trainer and admin accounts. The server message is only compared against
// the known shared constant to pick fixed copy; it is never shown raw.
function capacityError(err: unknown): MessageKey | null {
  if (!(err instanceof TRPCClientError)) return null;
  const data: unknown = err.data;
  const code =
    typeof data === 'object' && data !== null && 'code' in data ? (data as { code: unknown }).code : null;
  if (code !== 'FORBIDDEN') return null;
  return err.message === TRAINER_ACCOUNT_ONBOARDING_MESSAGE
    ? 'onboarding.trainerAccount'
    : 'onboarding.otherAccount';
}

function onboardingErrorKey(message: string): MessageKey {
  if (message.includes('NOT_FOUND') || message.includes('Sport not available')) {
    return 'onboarding.sportUnavailable';
  }
  if (message.includes('Too many requests')) return 'onboarding.tooManyRequests';
  return 'onboarding.createFailed';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { locale, t } = useMobileLocalization();
  const utils = trpc.useUtils();
  const sportsQuery = useSports();
  const bootstrap = useBootstrapAthlete();

  const [displayName, setDisplayName] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

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
      setError(capacityError(err) ?? onboardingErrorKey(message));
    }
  };

  return (
    <KeyboardAwareScrollView className="flex-1 bg-canvas" contentContainerClassName="px-6 pt-14 pb-10">
        <Text className="text-title2 font-bold text-text mb-2">
          {t('onboarding.title')}
        </Text>
        <Text className="text-body text-muted mb-8">
          {t('onboarding.intro')}
        </Text>

        {/* Display name */}
        <Text className="text-footnote font-semibold text-text mb-2">
          {t('onboarding.publicName')}
        </Text>
        <TextInput
          className="bg-paper border border-line rounded-lg px-4 py-3 text-body text-text mb-6"
          placeholder={t('onboarding.namePlaceholder')}
          placeholderTextColor={colors.subtle}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          editable={!isSubmitting}
          maxLength={100}
        />

        {/* Sport */}
        <Text className="text-footnote font-semibold text-text mb-2">
          {t('onboarding.mainSport')}
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
              {t('onboarding.sportsLoadFailed')}
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
        <Text className="text-footnote font-semibold text-text mb-2">{t('onboarding.country')}</Text>
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
                  {locale === 'es' ? country.es : country.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error !== null ? (
          <Text className="text-body text-red-600 mb-4">{error === null ? null : t(error)}</Text>
        ) : null}

        <Pressable
          className={`items-center justify-center rounded-lg py-4 bg-blue ${!isValid || isSubmitting ? 'opacity-50' : ''}`}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.createProfile')}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text className="text-body-lg font-semibold text-on-ink">
              {t('onboarding.createProfile')}
            </Text>
          )}
        </Pressable>
    </KeyboardAwareScrollView>
  );
}
