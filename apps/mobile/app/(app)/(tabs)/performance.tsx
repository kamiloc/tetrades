import {
  trpc,
  useMetricDefinitions,
  useMetricSummaries,
  useMyAthlete,
  useMyClubMemberships,
  useMyPublicProfile,
} from '@packages/api-client';
import {
  METRIC_ENTRY_PAGE_SIZE,
  METRIC_RANGES,
  filterEntriesByRange,
  isEntryListTruncated,
  needsMoreEntries,
  rangeStart,
  selectViewState,
  type MetricRange,
} from '@packages/shared-logic';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '../../../components/Card';
import { MSegmented } from '../../../components/MSegmented';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SectionTitle } from '../../../components/SectionTitle';
import { TabSkeleton } from '../../../components/Skeleton';
import { SpeedChart } from '../../../components/SpeedChart';
import { StatePanel } from '../../../components/StatePanel';
import { formatDate, formatMetric } from '../../../lib/format';
import { useMobileLocalization } from '../../../lib/i18n';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

const RECENT_ENTRY_COUNT = 5;

function PerformanceShell({ subtitle, children }: { subtitle: string; children: ReactElement }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('tabs.performance')} subtitle={subtitle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
        {children}
      </ScrollView>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <PerformanceShell subtitle={t('performance.sub.error')}>
      <View className="px-4 pt-4">
        <StatePanel
          tone="danger"
          icon="alert-circle"
          title={t('performance.error.title')}
          body={t('common.checkConnection')}
          primary={{ label: t('common.tryAgain'), onPress: onRetry }}
        />
      </View>
    </PerformanceShell>
  );
}

export default function PerformanceScreen(): ReactElement {
  const { t } = useMobileLocalization();
  const myAthlete = useMyAthlete();
  if (isBusy(myAthlete)) {
    return (
      <PerformanceShell subtitle={t('performance.sub.empty')}>
        <TabSkeleton variant="kpi" />
      </PerformanceShell>
    );
  }
  if (isFailed(myAthlete) || !myAthlete.data) {
    return <ErrorState onRetry={() => { void myAthlete.refetch(); }} />;
  }
  return <PerformanceBody athleteId={myAthlete.data.athleteId} sport={myAthlete.data.sport} />;
}

function PerformanceBody({ athleteId, sport }: { athleteId: string; sport: string | null }): ReactElement {
  const { locale, t } = useMobileLocalization();
  const summaries = useMetricSummaries(athleteId);
  const definitions = useMetricDefinitions({ take: 50 });
  const publicProfile = useMyPublicProfile();
  const memberships = useMyClubMemberships({ take: 50 });

  // "Soccer · Midfielder", or the empty-state subtitle without either.
  const subtitle =
    [sport, publicProfile.data?.primaryPosition].filter((part): part is string => !!part && part.trim() !== '').join(' · ') ||
    t('performance.sub.empty');
  const definitionById = useMemo(
    () => new Map((definitions.data?.items ?? []).map((d) => [d.id, d])),
    [definitions.data],
  );
  const clubNameById = useMemo(
    () => new Map((memberships.data?.items ?? []).map((m) => [m.club.id, m.club.name])),
    [memberships.data],
  );

  const summaryList = summaries.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = summaryList.find((s) => s.metricDefinitionId === selectedId) ?? summaryList[0];

  const state = selectViewState({
    isLoading: isBusy(summaries) || isBusy(definitions),
    isError: isFailed(summaries) || isFailed(definitions),
    isEmpty: summaryList.length === 0,
  });

  if (state === 'loading') {
    return (
      <PerformanceShell subtitle={subtitle}>
        <TabSkeleton variant="kpi" />
      </PerformanceShell>
    );
  }
  if (state === 'error') {
    return (
      <ErrorState
        onRetry={() => {
          void summaries.refetch();
          void definitions.refetch();
        }}
      />
    );
  }
  if (state === 'empty' || !selected) {
    return (
      <PerformanceShell subtitle={subtitle}>
        <View className="px-4 pt-4">
          <View className="flex-row flex-wrap gap-2.5">
            {[0, 1, 2, 3].map((n) => (
              <View key={n} className="w-[47%] grow rounded-xl border border-dashed border-dash bg-paper p-3.5">
                <Text className="text-caption text-muted">—</Text>
                <Text className="mt-1 text-[24px] font-bold text-text">—</Text>
              </View>
            ))}
          </View>
          <View className="pt-5">
            <StatePanel
              icon="activity"
              title={t('performance.empty.title')}
              body={t('performance.empty.body')}
              primary={{ label: t('common.viewClubs'), onPress: () => router.push('/clubs') }}
              secondary={{ label: t('common.manageVisibility'), onPress: () => router.push('/visibility') }}
            />
          </View>
        </View>
      </PerformanceShell>
    );
  }

  return (
    <PerformanceShell subtitle={subtitle}>
      <View>
        {/* KPI grid: one card per summary; tap to chart that metric */}
        <View className="px-4 pt-4">
          <View className="flex-row flex-wrap gap-2.5">
            {summaryList.map((summary) => {
              const def = definitionById.get(summary.metricDefinitionId);
              const unit = def?.unit ?? '';
              const isSelected = summary.metricDefinitionId === selected.metricDefinitionId;
              return (
                <Pressable
                  key={summary.metricDefinitionId}
                  onPress={() => setSelectedId(summary.metricDefinitionId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t('performance.kpiLabel', { metric: def?.name ?? t('common.metric'), value: formatMetric(locale, summary.latestValue, unit) })}
                  className="w-[47%] grow"
                >
                  <Card className={`p-3.5 ${isSelected ? 'border-blue' : ''}`}>
                    <Text className="text-caption font-bold uppercase text-muted" numberOfLines={1}>
                      {def?.name ?? t('common.metric')}
                    </Text>
                    <Text className="mt-1.5 text-[24px] font-bold text-text">
                      {formatMetric(locale, summary.latestValue, '')}
                    </Text>
                    <Text className="mt-0.5 text-meta text-subtle">{unit}</Text>
                    {summary.bestValue !== null ? (
                      <Text className="mt-1 text-meta text-blue">{t('performance.best', { value: formatMetric(locale, summary.bestValue, unit) })}</Text>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        <MetricTrend
          key={selected.metricDefinitionId}
          athleteId={athleteId}
          metricDefinitionId={selected.metricDefinitionId}
          metricName={definitionById.get(selected.metricDefinitionId)?.name ?? t('common.metric')}
          unit={definitionById.get(selected.metricDefinitionId)?.unit ?? ''}
          clubNameById={clubNameById}
        />
      </View>
    </PerformanceShell>
  );
}

function MetricTrend({
  athleteId,
  metricDefinitionId,
  metricName,
  unit,
  clubNameById,
}: {
  athleteId: string;
  metricDefinitionId: string;
  metricName: string;
  unit: string;
  clubNameById: ReadonlyMap<string, string>;
}): ReactElement {
  const { locale, t } = useMobileLocalization();
  const [range, setRange] = useState<MetricRange>('6M');
  const rangeLabels: Record<MetricRange, string> = {
    '1M': t('range.1M'),
    '3M': t('range.3M'),
    '6M': t('range.6M'),
    ALL: t('range.ALL'),
  };
  // Metrics are trainer-reported (ADR-013). Entries expose only the trainer's
  // id, so attribution names the club, never the trainer.
  const attribution = (clubName: string | undefined): string =>
    clubName ? t('performance.reportedAtClub', { club: clubName }) : t('performance.reportedByTrainer');
  const entries = trpc.metric.listEntries.useInfiniteQuery(
    { athleteId, metricDefinitionId, take: METRIC_ENTRY_PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );

  const loaded = useMemo(() => entries.data?.pages.flatMap((p) => p.items) ?? [], [entries.data]);
  const now = useMemo(() => new Date(), []);
  const start = rangeStart(range, now);
  const oldest = loaded.length > 0 ? (loaded[loaded.length - 1]?.measuredAt ?? null) : null;
  const hasNextPage = entries.hasNextPage;
  const { fetchNextPage, isFetchingNextPage } = entries;

  // Entries arrive newest first: keep paging until the range is covered.
  const wantMore = needsMoreEntries({ oldestMeasuredAt: oldest, rangeStart: start, loadedCount: loaded.length, hasNextPage });
  useEffect(() => {
    if (wantMore && !isFetchingNextPage) void fetchNextPage();
  }, [wantMore, isFetchingNextPage, fetchNextPage]);

  const inRange = filterEntriesByRange(loaded, range, now);
  const truncated = isEntryListTruncated(range, loaded.length, hasNextPage);
  const recent = [...inRange].reverse().slice(0, RECENT_ENTRY_COUNT);

  return (
    <View>
      <View className="px-4 pt-5">
        <SectionTitle>{metricName}</SectionTitle>
        <Card className="p-4">
          {isBusy(entries) ? (
            <View className="h-[116px] items-center justify-center">
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : isFailed(entries) ? (
            <Pressable onPress={() => { void entries.refetch(); }} accessibilityRole="button" className="min-h-[44px] justify-center">
              <Text className="text-center text-footnote text-danger">{t('performance.entriesLoadFailed')}</Text>
            </Pressable>
          ) : (
            <SpeedChart
              points={inRange.map((e) => ({ value: e.value, label: formatDate(locale, e.measuredAt, 'shortMonthYear') }))}
              accessibilityLabel={t('performance.chartLabel', { metric: metricName, range: rangeLabels[range], count: inRange.length })}
            />
          )}
          {!isBusy(entries) && !isFailed(entries) && inRange.length === 0 ? (
            <Text className="mt-2 text-center text-meta text-muted">{t('performance.noEntries')}</Text>
          ) : null}
          {truncated ? (
            <Text className="mt-2 text-center text-meta text-muted">{t('performance.showingLatest', { count: loaded.length })}</Text>
          ) : null}
          <View className="mt-3">
            <MSegmented
              options={METRIC_RANGES}
              labels={rangeLabels}
              value={range}
              onChange={setRange}
              accessibilityLabel={t('performance.timeRange')}
            />
          </View>
        </Card>
      </View>

      <View className="px-4 pt-5">
        <SectionTitle>{t('performance.sub.empty')}</SectionTitle>
        <Card>
          {recent.length === 0 ? (
            <Text className="px-4 py-3 text-footnote text-muted">{t('performance.noEntries')}</Text>
          ) : (
            recent.map((entry, index) => (
              <View
                key={entry.id}
                className={`flex-row items-center gap-3 px-4 py-3 ${index === recent.length - 1 ? '' : 'border-b border-line'}`}
              >
                <View className="flex-1">
                  <Text className="text-row-title text-text">{formatMetric(locale, entry.value, unit)}</Text>
                  <Text className="mt-0.5 text-meta text-muted">
                    {formatDate(locale, entry.measuredAt, 'medium')} · {attribution(clubNameById.get(entry.clubId))}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </View>
    </View>
  );
}
