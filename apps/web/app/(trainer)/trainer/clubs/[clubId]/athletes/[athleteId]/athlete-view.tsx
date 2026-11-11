'use client';

import { getApiErrorCode, trpc, useRosterAthlete } from '@packages/api-client';
import type {
  AthleteMetricEntryOutput,
  AthleteMetricSummaryOutput,
  ClubRosterEntryOutput,
  MetricDefinitionPublicOutput,
} from '@packages/validators';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button, buttonClasses } from '../../../../../../../components/button';
import { InlineAlert } from '../../../../../../../components/inline-alert';
import { PageBody, PageHeader, Panel } from '../../../../../../../components/layout';
import { TopBar } from '../../../../../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../../../../../components/states';
import { StatusChip } from '../../../../../../../components/status-chip';
import { Table, type Column } from '../../../../../../../components/table';
import { formatDate, formatNumber } from '../../../../../../../lib/format';
import { useWebLocalization } from '../../../../../../../lib/i18n';
import type { AppLocale } from '../../../../../../../lib/locale-selection';
import { trainerErrorNotice } from '../../../../../../../lib/trainer/errors';
import {
  useCurrentClub,
  useMetricCatalog,
  useRefreshOnLostAccess,
} from '../../../../../../../lib/trainer/use-trainer';
import type { MessageKey, MessageValues } from '../../../../../../../lib/translations';
import { LoadMore } from '../../../../_components/load-more';

import { LogMetricDialog } from './log-metric-dialog';

type Translate = (key: MessageKey, values?: MessageValues) => string;

function valueWithUnit(
  locale: AppLocale,
  t: Translate,
  value: number,
  definition: MetricDefinitionPublicOutput | undefined,
): string {
  const number = formatNumber(locale, value, 3);
  return definition ? t('athlete.valueWithUnit', { value: number, unit: definition.unit }) : number;
}

/** "Reported by <club>" for this club's entries, "another club" otherwise (design D5). */
export function entryAttribution(
  entry: Pick<AthleteMetricEntryOutput, 'clubId'>,
  clubId: string,
  clubName: string,
  t: Translate,
): string {
  return entry.clubId === clubId ? t('athlete.reportedByClub', { club: clubName }) : t('athlete.reportedByOther');
}

function SummaryCard({
  summary,
  definition,
}: {
  summary: AthleteMetricSummaryOutput;
  definition: MetricDefinitionPublicOutput | undefined;
}) {
  const { locale, t } = useWebLocalization();
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-[12px] border border-line bg-paper2 p-3.5">
      <p className="truncate text-[12px] font-semibold text-muted">{definition?.name ?? t('athlete.retiredMetric')}</p>
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-subtle">{t('athlete.latest')}</dt>
          <dd className="text-[15px] font-bold text-text">{valueWithUnit(locale, t, summary.latestValue, definition)}</dd>
          <dd className="text-muted">{formatDate(locale, summary.latestMeasuredAt)}</dd>
        </div>
        <div>
          <dt className="text-subtle">{t('athlete.best')}</dt>
          {summary.bestValue !== null && summary.bestMeasuredAt !== null ? (
            <>
              <dd className="text-[15px] font-bold text-text">{valueWithUnit(locale, t, summary.bestValue, definition)}</dd>
              <dd className="text-muted">{formatDate(locale, summary.bestMeasuredAt)}</dd>
            </>
          ) : (
            <dd className="text-muted">{t('athlete.noBest')}</dd>
          )}
        </div>
      </dl>
    </li>
  );
}

function ActiveMemberMetrics({
  clubId,
  clubName,
  athlete,
  definitions,
  onLog,
}: {
  clubId: string;
  clubName: string;
  athlete: ClubRosterEntryOutput['athlete'];
  definitions: Map<string, MetricDefinitionPublicOutput>;
  onLog: () => void;
}) {
  const { locale, t } = useWebLocalization();
  const summaries = trpc.metric.getSummaries.useQuery({ athleteId: athlete.id });
  const entries = trpc.metric.listEntries.useInfiniteQuery(
    { athleteId: athlete.id, take: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const rows = entries.data?.pages.flatMap((page) => page.items) ?? [];

  const columns: Column<AthleteMetricEntryOutput>[] = [
    {
      header: t('athlete.colMetric'),
      className: 'w-[32%]',
      cell: (e) => <span className="font-semibold">{definitions.get(e.metricDefinitionId)?.name ?? t('athlete.retiredMetric')}</span>,
    },
    { header: t('athlete.colValue'), cell: (e) => valueWithUnit(locale, t, e.value, definitions.get(e.metricDefinitionId)) },
    { header: t('athlete.colMeasured'), cell: (e) => <span className="text-muted">{formatDate(locale, e.measuredAt)}</span> },
    { header: t('athlete.colReportedBy'), cell: (e) => <span className="text-muted">{entryAttribution(e, clubId, clubName, t)}</span> },
  ];

  return (
    <>
      <Panel title={t('athlete.summaries')}>
        {summaries.isPending ? (
          <LoadingState label={t('athlete.summariesLoading')} />
        ) : summaries.isError ? (
          <ErrorState title={t('athlete.summariesLoadFailed')} onRetry={() => void summaries.refetch()} />
        ) : summaries.data.length === 0 ? (
          <p className="text-[13px] text-muted">{t('athlete.noSummaries')}</p>
        ) : (
          <ul aria-label={t('athlete.summariesLabel')} className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {summaries.data.map((summary) => (
              <SummaryCard
                key={summary.metricDefinitionId}
                summary={summary}
                definition={definitions.get(summary.metricDefinitionId)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {entries.isPending ? (
        <LoadingState label={t('athlete.entriesLoading')} />
      ) : entries.isError ? (
        <ErrorState title={t('athlete.entriesLoadFailed')} onRetry={() => void entries.refetch()} />
      ) : (
        <>
          <Table
            caption={t('athlete.entriesCaption', { athlete: athlete.displayName })}
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            empty={
              <EmptyState
                icon="flag"
                title={t('athlete.noMetrics')}
                action={
                  <Button variant="primary" icon="plus" onClick={onLog}>
                    {t('athlete.logMetric')}
                  </Button>
                }
              >
                {t('athlete.firstMeasurement')}
              </EmptyState>
            }
          />
          <LoadMore
            show={entries.hasNextPage}
            loading={entries.isFetchingNextPage}
            onClick={() => void entries.fetchNextPage()}
          />
        </>
      )}
    </>
  );
}

export function AthleteView({ clubId, athleteId }: { clubId: string; athleteId: string }) {
  const { t } = useWebLocalization();
  const { club } = useCurrentClub(clubId);
  const clubName = club?.name ?? t('roster.thisClub');
  const member = useRosterAthlete({ clubId, athleteId });
  const lostAccess = useRefreshOnLostAccess(member.error, 'load-athlete');
  const active = member.data?.status === 'ACTIVE';
  const catalog = useMetricCatalog({ enabled: active });
  const definitions = useMemo(
    () => new Map(catalog.definitions.map((d) => [d.id, d])),
    [catalog.definitions],
  );
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);

  const rosterHref = `/trainer/clubs/${clubId}/athletes`;
  const crumbs = (label: string) => [
    { label: club?.name ?? t('trainer.clubLabel'), href: rosterHref },
    { label: t('nav.athletes'), href: rosterHref },
    { label },
  ];

  if (member.isPending || lostAccess) {
    return (
      <>
        <TopBar crumbs={crumbs(t('common.athlete'))} />
        <PageBody>
          <LoadingState label={t('athlete.loading')} />
        </PageBody>
      </>
    );
  }

  if (member.isError) {
    const notFound =
      trainerErrorNotice(getApiErrorCode(member.error), null, 'load-athlete').kind === 'athlete-not-found';
    return (
      <>
        <TopBar crumbs={crumbs(notFound ? t('admin.notFound') : t('common.athlete'))} />
        <PageBody>
          {notFound ? (
            <EmptyState
              icon="users"
              title={t('athlete.notFoundTitle')}
              action={
                <Link href={rosterHref} className={buttonClasses('secondary')}>
                  {t('athlete.backToAthletes')}
                </Link>
              }
            >
              {t('athlete.notFoundBody')}
            </EmptyState>
          ) : (
            <ErrorState title={t('athlete.loadFailed')} onRetry={() => void member.refetch()} />
          )}
        </PageBody>
      </>
    );
  }

  const { athlete } = member.data;
  const logButton = active ? (
    <Button variant="primary" icon="plus" onClick={() => setLogging(true)} disabled={catalog.isPending}>
      {t('athlete.logMetric')}
    </Button>
  ) : undefined;

  return (
    <>
      <TopBar crumbs={crumbs(athlete.displayName)} action={logButton} />
      <PageBody>
        <PageHeader
          title={athlete.displayName}
          sub={
            <span className="inline-flex items-center gap-2">
              {t('common.handleSport', { handle: athlete.slug, sport: athlete.sport.name })}
              <StatusChip status={active ? 'active' : 'waitingAthlete'} />
            </span>
          }
        />
        {logged ? (
          <InlineAlert tone="success" title={t('athlete.loggedTitle')}>
            {t('athlete.loggedBody', { entry: logged, athlete: athlete.displayName })}
          </InlineAlert>
        ) : null}
        {active ? (
          <ActiveMemberMetrics
            clubId={clubId}
            clubName={clubName}
            athlete={athlete}
            definitions={definitions}
            onLog={() => setLogging(true)}
          />
        ) : (
          <InlineAlert tone="info" title={t('athlete.waitingTitle')}>
            {t('athlete.waitingBody', { athlete: athlete.displayName, club: clubName })}
          </InlineAlert>
        )}
      </PageBody>
      {active ? (
        <LogMetricDialog
          open={logging}
          onClose={() => setLogging(false)}
          onLogged={(label) => setLogged(label)}
          clubId={clubId}
          clubName={clubName}
          athlete={athlete}
          definitions={catalog.definitions}
        />
      ) : null}
    </>
  );
}
