import { trpc, useMyVisibilitySettings, useUpdateVisibilitySettings } from '@packages/api-client';
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  audienceDefaultLabel,
  type AudienceValue,
  type VisibilityCategory,
} from '@packages/shared-logic';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { MSegmented } from '../../components/MSegmented';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TabSkeleton } from '../../components/Skeleton';
import { StatePanel } from '../../components/StatePanel';
import { useToast } from '../../components/Toast';
import { mutationErrorMessage } from '../../lib/mutation-errors';
import { isBusy, isFailed } from '../../lib/query-state';

const CATEGORIES: ReadonlyArray<{ key: VisibilityCategory; title: string; description: string }> = [
  {
    key: 'achievementsAudience',
    title: 'Achievements',
    description: 'Only verified achievements are shown to others.',
  },
  {
    key: 'clubMembershipsAudience',
    title: 'Club memberships',
    description: 'Only active memberships can appear on your profile.',
  },
  {
    key: 'metricsAudience',
    title: 'Performance metrics',
    description: 'Trainer-reported entries and summaries.',
  },
];

// Who can see each category (ADR-013, ADR-014). Each change sends only that
// category; the control updates at once and rolls back if the save fails.
export default function VisibilityScreen(): ReactElement {
  const utils = trpc.useUtils();
  const settings = useMyVisibilitySettings();
  const update = useUpdateVisibilitySettings();
  const toast = useToast();

  const change = (key: VisibilityCategory, value: AudienceValue): void => {
    const previous = utils.visibility.get.getData();
    if (previous) utils.visibility.get.setData(undefined, { ...previous, [key]: value });
    update.mutate(
      { [key]: value },
      {
        onSuccess: (saved) => {
          utils.visibility.get.setData(undefined, saved);
          const category = CATEGORIES.find((c) => c.key === key)?.title ?? 'Visibility';
          toast.success(`${category}: ${AUDIENCE_LABELS[value]}`);
        },
        onError: (error) => {
          if (previous) utils.visibility.get.setData(undefined, previous);
          toast.error(mutationErrorMessage(error, { fallback: "Couldn't save this setting. Try again." }));
        },
        onSettled: () => {
          void utils.visibility.get.invalidate();
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Visibility" subtitle="Choose who sees what" onBack={() => router.back()} />
      {isBusy(settings) ? (
        <TabSkeleton variant="list" />
      ) : isFailed(settings) || !settings.data ? (
        <View className="px-4 pt-4">
          <StatePanel
            tone="danger"
            icon="alert-circle"
            title="Couldn't load your settings"
            body="Check your connection and try again."
            primary={{ label: 'Try again', onPress: () => { void settings.refetch(); } }}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-6 pt-4">
          {CATEGORIES.map(({ key, title, description }) => (
            <Card key={key} className="p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-row-title text-text">{title}</Text>
                  <Text className="mt-1 text-meta text-muted">{description}</Text>
                </View>
                <Text className="text-caption font-semibold text-subtle">{audienceDefaultLabel(key)}</Text>
              </View>
              <View className="mt-3">
                <MSegmented
                  options={AUDIENCE_OPTIONS}
                  labels={AUDIENCE_LABELS}
                  value={settings.data[key]}
                  onChange={(value) => change(key, value)}
                  accessibilityLabel={`${title} audience`}
                />
              </View>
            </Card>
          ))}
          <Text className="px-1 text-meta text-muted">
            Connections means athletes you're connected with. You always see all of your own data, and trainers at
            an active club can always see the metrics that club reported.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
