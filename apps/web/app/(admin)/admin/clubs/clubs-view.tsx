'use client';

import { trpc } from '@packages/api-client';
import type { AdminClubOutput, AdminClubStatusFilter } from '@packages/validators';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '../../../../components/button';
import { focusRing } from '../../../../components/focus';
import { InlineAlert } from '../../../../components/inline-alert';
import { PageBody, PageHeader, Toolbar } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { SegmentedFilter } from '../../../../components/segmented-filter';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/states';
import { StatusChip } from '../../../../components/status-chip';
import { NameCell, Table, type Column } from '../../../../components/table';
import { formatNumber } from '../../../../lib/format';
import { useWebLocalization } from '../../../../lib/i18n';
import type { MessageKey } from '../../../../lib/translations';

import { ClubFormDialog } from './club-form-dialog';

const FILTERS: { value: AdminClubStatusFilter; label: MessageKey }[] = [
  { value: 'ACTIVE', label: 'admin.clubs.filterActive' },
  { value: 'DEACTIVATED', label: 'admin.clubs.filterDeactivated' },
  { value: 'ALL', label: 'admin.clubs.filterAll' },
];

const EMPTY_COPY: Record<AdminClubStatusFilter, MessageKey> = {
  ACTIVE: 'admin.clubs.emptyActive',
  DEACTIVATED: 'admin.clubs.emptyDeactivated',
  ALL: 'admin.clubs.emptyAll',
};

function parseFilter(value: string | null): AdminClubStatusFilter {
  return value === 'DEACTIVATED' || value === 'ALL' ? value : 'ACTIVE';
}

export function ClubsView() {
  const { locale, t } = useWebLocalization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('status'));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const columns: Column<AdminClubOutput>[] = [
  {
    header: t('admin.clubs.colClub'),
    className: 'w-[40%]',
    cell: (club) => (
      <Link
        href={`/admin/clubs/${club.id}`}
        className={`block min-w-0 rounded-sm hover:underline ${focusRing}`}
      >
        <NameCell title={club.name} sub={club.slug} />
      </Link>
    ),
  },
  {
    header: t('admin.clubs.colLocation'),
    cell: (club) => (
      <span className="text-muted">
        {club.city ? t('common.location', { city: club.city, country: club.countryCode }) : club.countryCode}
      </span>
    ),
  },
  {
    header: t('common.status'),
    cell: (club) => <StatusChip status={club.isActive ? 'active' : 'deactivated'} />,
  },
  {
    header: t('admin.clubs.colActiveTrainers'),
    align: 'right',
    cell: (club) => <span className="font-semibold tabular-nums">{formatNumber(locale, club.activeTrainerCount)}</span>,
  },
  ];

  const clubs = trpc.admin.listClubs.useInfiniteQuery(
    { status: filter, take: 20 },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );

  const setFilter = (value: AdminClubStatusFilter) => {
    router.replace(value === 'ACTIVE' ? '/admin/clubs' : `/admin/clubs?status=${value}`, {
      scroll: false,
    });
  };

  const rows = clubs.data?.pages.flatMap((page) => page.items) ?? [];
  const createButton = (
    <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
      {t('admin.clubs.create')}
    </Button>
  );

  return (
    <>
      <TopBar crumbs={[{ label: t('admin.crumb') }, { label: t('nav.clubs') }]} action={createButton} />
      <PageBody>
        <PageHeader title={t('nav.clubs')} sub={t('admin.clubs.sub')} />
        {created ? (
          <InlineAlert
            tone="success"
            title={t('admin.clubs.created', { name: created.name })}
            action={
              <Button size="sm" variant="link" onClick={() => setCreated(null)}>
                {t('common.dismiss')}
              </Button>
            }
          >
            <Link
              href={`/admin/clubs/${created.id}/trainers`}
              className={`rounded-sm text-blue hover:underline ${focusRing}`}
            >
              {t('admin.clubs.inviteTrainers')}
            </Link>
          </InlineAlert>
        ) : null}
        <Toolbar
          left={
            <SegmentedFilter
              label={t('admin.clubs.statusFilter')}
              options={FILTERS.map((option) => ({ value: option.value, label: t(option.label) }))}
              value={filter}
              onChange={setFilter}
            />
          }
        />
        {clubs.isPending ? (
          <LoadingState label={t('admin.clubs.loading')} />
        ) : clubs.isError ? (
          <ErrorState title={t('admin.clubs.loadFailed')} onRetry={() => void clubs.refetch()} />
        ) : (
          <Table
            caption={t('nav.clubs')}
            columns={columns}
            rows={rows}
            rowKey={(club) => club.id}
            empty={
              <EmptyState title={t(EMPTY_COPY[filter])} action={createButton}>
                {t('admin.clubs.emptyBody')}
              </EmptyState>
            }
            footer={
              clubs.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void clubs.fetchNextPage()}
                    disabled={clubs.isFetchingNextPage}
                  >
                    {clubs.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}
      </PageBody>
      <ClubFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(club) => {
          setCreating(false);
          setCreated(club);
          if (filter === 'DEACTIVATED') setFilter('ACTIVE');
        }}
      />
    </>
  );
}
