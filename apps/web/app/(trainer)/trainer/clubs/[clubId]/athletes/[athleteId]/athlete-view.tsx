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
import { formatDate } from '../../../../../../../lib/format';
import { trainerErrorNotice } from '../../../../../../../lib/trainer/errors';
import {
  useCurrentClub,
  useMetricCatalog,
  useRefreshOnLostAccess,
} from '../../../../../../../lib/trainer/use-trainer';
import { LoadMore } from '../../../../_components/load-more';

import { LogMetricDialog } from './log-metric-dialog';

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

function valueWithUnit(value: number, definition: MetricDefinitionPublicOutput | undefined): string {
  return definition ? `${NUMBER.format(value)} ${definition.unit}` : NUMBER.format(value);
}

/** "Reported by <club>" for this club's entries, "another club" otherwise (design D5). */
export function entryAttribution(entry: Pick<AthleteMetricEntryOutput, 'clubId'>, clubId: string, clubName: string): string {
  return entry.clubId === clubId ? `Reported by ${clubName}` : 'Reported by another club';
}

function SummaryCard({
  summary,
  definition,
}: {
  summary: AthleteMetricSummaryOutput;
  definition: MetricDefinitionPublicOutput | undefined;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-[12px] border border-line bg-paper2 p-3.5">
      <p className="truncate text-[12px] font-semibold text-muted">{definition?.name ?? 'Retired metric'}</p>
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-subtle">Latest</dt>
          <dd className="text-[15px] font-bold text-text">{valueWithUnit(summary.latestValue, definition)}</dd>
          <dd className="text-muted">{formatDate(summary.latestMeasuredAt)}</dd>
        </div>
        <div>
          <dt className="text-subtle">Best</dt>
          {summary.bestValue !== null && summary.bestMeasuredAt !== null ? (
            <>
              <dd className="text-[15px] font-bold text-text">{valueWithUnit(summary.bestValue, definition)}</dd>
              <dd className="text-muted">{formatDate(summary.bestMeasuredAt)}</dd>
            </>
          ) : (
            <dd className="text-muted">No best for this metric</dd>
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
  const summaries = trpc.metric.getSummaries.useQuery({ athleteId: athlete.id });
  const entries = trpc.metric.listEntries.useInfiniteQuery(
    { athleteId: athlete.id, take: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const rows = entries.data?.pages.flatMap((page) => page.items) ?? [];

  const columns: Column<AthleteMetricEntryOutput>[] = [
    {
      header: 'Metric',
      className: 'w-[32%]',
      cell: (e) => <span className="font-semibold">{definitions.get(e.metricDefinitionId)?.name ?? 'Retired metric'}</span>,
    },
    { header: 'Value', cell: (e) => valueWithUnit(e.value, definitions.get(e.metricDefinitionId)) },
    { header: 'Measured', cell: (e) => <span className="text-muted">{formatDate(e.measuredAt)}</span> },
    { header: 'Reported by', cell: (e) => <span className="text-muted">{entryAttribution(e, clubId, clubName)}</span> },
  ];

  return (
    <>
      <Panel title="Summaries">
        {summaries.isPending ? (
          <LoadingState label="Loading summaries…" />
        ) : summaries.isError ? (
          <ErrorState title="We couldn't load the summaries" onRetry={() => void summaries.refetch()} />
        ) : summaries.data.length === 0 ? (
          <p className="text-[13px] text-muted">No summaries yet. They appear after the first entry.</p>
        ) : (
          <ul aria-label="Metric summaries" className="grid grid-cols-2 gap-3 xl:grid-cols-3">
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
        <LoadingState label="Loading entries…" />
      ) : entries.isError ? (
        <ErrorState title="We couldn't load the entries" onRetry={() => void entries.refetch()} />
      ) : (
        <>
          <Table
            caption={`Metric entries of ${athlete.displayName}, newest first`}
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            empty={
              <EmptyState
                icon="flag"
                title="No metrics yet"
                action={
                  <Button variant="primary" icon="plus" onClick={onLog}>
                    Log metric
                  </Button>
                }
              >
                Log this athlete&apos;s first measurement.
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
  const { club } = useCurrentClub(clubId);
  const clubName = club?.name ?? 'this club';
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
    { label: club?.name ?? 'Club', href: rosterHref },
    { label: 'Athletes', href: rosterHref },
    { label },
  ];

  if (member.isPending || lostAccess) {
    return (
      <>
        <TopBar crumbs={crumbs('Athlete')} />
        <PageBody>
          <LoadingState label="Loading athlete…" />
        </PageBody>
      </>
    );
  }

  if (member.isError) {
    const notFound =
      trainerErrorNotice(getApiErrorCode(member.error), null, 'load-athlete').kind === 'athlete-not-found';
    return (
      <>
        <TopBar crumbs={crumbs(notFound ? 'Not found' : 'Athlete')} />
        <PageBody>
          {notFound ? (
            <EmptyState
              icon="users"
              title="Athlete not found"
              action={
                <Link href={rosterHref} className={buttonClasses('secondary')}>
                  Back to athletes
                </Link>
              }
            >
              This athlete isn&apos;t on the club&apos;s roster. Their membership may have ended,
              or the link is wrong.
            </EmptyState>
          ) : (
            <ErrorState title="We couldn't load this athlete" onRetry={() => void member.refetch()} />
          )}
        </PageBody>
      </>
    );
  }

  const { athlete } = member.data;
  const logButton = active ? (
    <Button variant="primary" icon="plus" onClick={() => setLogging(true)} disabled={catalog.isPending}>
      Log metric
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
              @{athlete.slug} · {athlete.sport.name}
              <StatusChip status={active ? 'active' : 'waitingAthlete'} />
            </span>
          }
        />
        {logged ? (
          <InlineAlert tone="success" title="Metric logged">
            {logged} was added to {athlete.displayName}&apos;s entries.
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
          <InlineAlert tone="info" title="Waiting for the athlete to confirm">
            You invited {athlete.displayName} to {clubName}. Until they confirm, you can&apos;t see
            or log their metrics.
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
