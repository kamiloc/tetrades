'use client';

import { trpc } from '@packages/api-client';
import type { ClubRosterEntryOutput } from '@packages/validators';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '../../../../../../components/button';
import { focusRing } from '../../../../../../components/focus';
import { PageBody, PageHeader } from '../../../../../../components/layout';
import { TopBar } from '../../../../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../../../../components/states';
import { StatusChip } from '../../../../../../components/status-chip';
import { NameCell, Table, type Column } from '../../../../../../components/table';
import { formatDate } from '../../../../../../lib/format';
import { useWebLocalization } from '../../../../../../lib/i18n';
import type { AppLocale } from '../../../../../../lib/locale-selection';
import { useCurrentClub, useRefreshOnLostAccess } from '../../../../../../lib/trainer/use-trainer';
import type { MessageKey, MessageValues } from '../../../../../../lib/translations';
import { LoadMore } from '../../../_components/load-more';

import { InviteAthleteDialog } from './invite-athlete-dialog';

export function athletePath(clubId: string, athleteId: string): string {
  return `/trainer/clubs/${clubId}/athletes/${athleteId}`;
}

function columns(
  clubId: string,
  locale: AppLocale,
  t: (key: MessageKey, values?: MessageValues) => string,
): Column<ClubRosterEntryOutput>[] {
  return [
    {
      header: t('common.athlete'),
      className: 'w-[38%]',
      cell: (row) => (
        <Link
          href={athletePath(clubId, row.athlete.id)}
          className={`block min-w-0 rounded-sm hover:underline ${focusRing}`}
        >
          <NameCell title={row.athlete.displayName} sub={`@${row.athlete.slug}`} />
        </Link>
      ),
    },
    { header: t('roster.colSport'), cell: (row) => <span className="text-muted">{row.athlete.sport.name}</span> },
    {
      header: t('common.status'),
      cell: (row) => (
        <StatusChip status={row.status === 'ACTIVE' ? 'active' : 'waitingAthlete'} />
      ),
    },
    {
      header: t('roster.colSince'),
      cell: (row) => (
        <span className="text-muted">
          {row.status === 'ACTIVE'
            ? t('roster.joined', { date: formatDate(locale, row.respondedAt ?? row.createdAt) })
            : t('roster.invited', { date: formatDate(locale, row.createdAt) })}
        </span>
      ),
    },
  ];
}

export function RosterView({ clubId }: { clubId: string }) {
  const { locale, t } = useWebLocalization();
  const { club } = useCurrentClub(clubId);
  const roster = trpc.club.listRoster.useInfiniteQuery(
    { clubId, take: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const lostAccess = useRefreshOnLostAccess(roster.error);
  const [inviting, setInviting] = useState(false);
  const rows = roster.data?.pages.flatMap((page) => page.items) ?? [];
  const clubName = club?.name ?? t('trainer.clubLabel');

  const inviteButton = (
    <Button variant="primary" icon="plus" onClick={() => setInviting(true)}>
      {t('roster.invite')}
    </Button>
  );

  return (
    <>
      <TopBar
        crumbs={[{ label: clubName, href: `/trainer/clubs/${clubId}/athletes` }, { label: t('nav.athletes') }]}
        action={inviteButton}
      />
      <PageBody>
        <PageHeader
          title={t('nav.athletes')}
          sub={t('roster.sub')}
        />
        {roster.isPending || lostAccess ? (
          <LoadingState label={t('roster.loading')} />
        ) : roster.isError ? (
          <ErrorState title={t('roster.loadFailed')} onRetry={() => void roster.refetch()} />
        ) : (
          <>
            <Table
              caption={t('roster.caption', { club: clubName })}
              columns={columns(clubId, locale, t)}
              rows={rows}
              rowKey={(row) => row.id}
              empty={
                <EmptyState icon="users" title={t('roster.emptyTitle')} action={inviteButton}>
                  {t('roster.emptyBody')}
                </EmptyState>
              }
            />
            <LoadMore
              show={roster.hasNextPage}
              loading={roster.isFetchingNextPage}
              onClick={() => void roster.fetchNextPage()}
            />
          </>
        )}
      </PageBody>
      <InviteAthleteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        clubId={clubId}
        clubName={club?.name ?? t('roster.thisClub')}
      />
    </>
  );
}
