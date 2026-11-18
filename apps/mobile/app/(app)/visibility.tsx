import { trpc, useMyVisibilitySettings, useUpdateVisibilitySettings } from '@packages/api-client';
import {
  AUDIENCE_DEFAULTS,
  AUDIENCE_OPTIONS,
  type AudienceValue,
  type VisibilityCategory,
} from '@packages/shared-logic';
import { router } from 'expo-router';
import { useRef, type ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { MSegmented } from '../../components/MSegmented';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TabSkeleton } from '../../components/Skeleton';
import { StatePanel } from '../../components/StatePanel';
import { useToast } from '../../components/Toast';
import { useMobileLocalization } from '../../lib/i18n';
import { mutationErrorMessage } from '../../lib/mutation-errors';
import { isBusy, isFailed } from '../../lib/query-state';

const CATEGORIES: readonly VisibilityCategory[] = ['achievementsAudience', 'clubMembershipsAudience', 'metricsAudience'];

// Who can see each category (ADR-013, ADR-014). Each change sends only that
// category; the control updates at once and rolls back if that save fails.
export default function VisibilityScreen(): ReactElement {
  const { t } = useMobileLocalization();
  const audienceLabels: Record<AudienceValue, string> = {
    PRIVATE: t('audience.PRIVATE'),
    CONNECTIONS: t('audience.CONNECTIONS'),
    PUBLIC: t('audience.PUBLIC'),
  };
  const utils = trpc.useUtils();
  const settings = useMyVisibilitySettings();
  const update = useUpdateVisibilitySettings();
  const toast = useToast();

  // Saves still in flight. Several categories can change before the first save
  // settles, so each callback touches only its own category, and the refetch
  // waits until the last save settles.
  const inFlight = useRef(0);

  const change = (key: VisibilityCategory, value: AudienceValue): void => {
    const previousValue = utils.visibility.get.getData()?.[key];
    void utils.visibility.get.cancel();
    utils.visibility.get.setData(undefined, (current) => (current ? { ...current, [key]: value } : current));
    inFlight.current += 1;
    update.mutate(
      { [key]: value },
      {
        onSuccess: (saved) => {
          utils.visibility.get.setData(undefined, (current) => (current ? { ...current, [key]: saved[key] } : saved));
          toast.success(t('visibility.saved', { category: t(`visibility.${key}.title`), audience: audienceLabels[value] }));
        },
        onError: (error) => {
          // Roll back only if this save's value is still showing; a later change
          // to the same category wins.
          utils.visibility.get.setData(undefined, (current) =>
            current && previousValue !== undefined && current[key] === value
              ? { ...current, [key]: previousValue }
              : current,
          );
          toast.error(mutationErrorMessage(error, { fallback: t('visibility.saveFailed') }));
        },
        onSettled: () => {
          inFlight.current -= 1;
          if (inFlight.current === 0) void utils.visibility.get.invalidate();
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('visibility.title')} subtitle={t('visibility.subtitle')} onBack={() => router.back()} />
      {isBusy(settings) ? (
        <TabSkeleton variant="list" />
      ) : isFailed(settings) || !settings.data ? (
        <View className="px-4 pt-4">
          <StatePanel
            tone="danger"
            icon="alert-circle"
            title={t('visibility.loadFailed')}
            body={t('common.checkConnection')}
            primary={{ label: t('common.tryAgain'), onPress: () => { void settings.refetch(); } }}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-6 pt-4">
          {CATEGORIES.map((key) => (
            <Card key={key} className="p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-row-title text-text">{t(`visibility.${key}.title`)}</Text>
                  <Text className="mt-1 text-meta text-muted">{t(`visibility.${key}.description`)}</Text>
                </View>
                <Text className="text-caption font-semibold text-subtle">{t('visibility.default', { audience: audienceLabels[AUDIENCE_DEFAULTS[key]] })}</Text>
              </View>
              <View className="mt-3">
                <MSegmented
                  options={AUDIENCE_OPTIONS}
                  labels={audienceLabels}
                  value={settings.data[key]}
                  onChange={(value) => change(key, value)}
                  accessibilityLabel={t('visibility.audienceLabel', { category: t(`visibility.${key}.title`) })}
                />
              </View>
            </Card>
          ))}
          <Text className="px-1 text-meta text-muted">
            {t('visibility.footnote')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
