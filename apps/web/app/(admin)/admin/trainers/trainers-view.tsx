'use client';

import { useAdminTrainers } from '@packages/api-client';
import type {
  AdminTrainerAccess,
  AdminTrainerAccessFilter,
  AdminTrainerDirectoryEntryOutput,
} from '@packages/validators';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '../../../../components/button';
import { TextInput } from '../../../../components/field';
import { focusRing } from '../../../../components/focus';
import { PageBody, PageHeader, Toolbar } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { SegmentedFilter } from '../../../../components/segmented-filter';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/states';
import { StatusChip, type StatusKey } from '../../../../components/status-chip';
import { NameCell, Table, type Column } from '../../../../components/table';
import { formatDate } from '../../../../lib/format';
import { withParams } from '../../../../lib/href';
import { useWebLocalization } from '../../../../lib/i18n';
import type { MessageKey } from '../../../../lib/translations';
import { searchTerm, useDebounced } from '../../../../lib/use-debounced';

const FILTERS: { value: AdminTrainerAccessFilter; label: MessageKey }[] = [
  { value: 'ACTIVE', label: 'admin.directory.filterActive' },
  { value: 'CLUB_DEACTIVATED', label: 'admin.directory.filterClubDeactivated' },
  { value: 'REVOKED', label: 'admin.directory.filterRevoked' },
  { value: 'ALL', label: 'admin.clubs.filterAll' },
];

// Never "Active" for a trainer whose club is deactivated (ADR-017).
const ACCESS_CHIP: Record<AdminTrainerAccess, StatusKey> = {
  ACTIVE: 'active',
  CLUB_DEACTIVATED: 'clubDeactivated',
  REVOKED: 'revoked',
};

function parseAccess(value: string | null): AdminTrainerAccessFilter {
  return FILTERS.find((f) => f.value === value)?.value ?? 'ACTIVE';
}

function directoryHref(access: AdminTrainerAccessFilter, club: string | undefined): string {
  return withParams('/admin/trainers', { access: access === 'ACTIVE' ? undefined : access, club });
}

export function TrainersDirectoryView() {
  const { locale, t } = useWebLocalization();

  const COLUMNS: Column<AdminTrainerDirectoryEntryOutput>[] = [
    {
      header: t('admin.clubs.colClub'),
      className: 'w-[32%]',
      cell: (row) => (
        <Link
          href={`/admin/clubs/${row.club.id}/trainers`}
          className={`flex min-w-0 items-center gap-2 rounded-sm hover:underline ${focusRing}`}
        >
          <NameCell title={row.club.name} sub={row.club.slug} />
          {row.club.isActive ? null : <StatusChip status="deactivated" />}
        </Link>
      ),
    },
    {
      header: t('admin.directory.colInvitedAs'),
      className: 'w-[28%]',
      cell: (row) =>
        row.invitedEmail === null ? (
          <span className="text-muted">{t('admin.trainers.provisioned')}</span>
        ) : (
          <span className="block truncate">{row.invitedEmail}</span>
        ),
    },
    { header: t('admin.directory.colAccess'), cell: (row) => <StatusChip status={ACCESS_CHIP[row.access]} /> },
    {
      header: t('admin.directory.colAdded'),
      cell: (row) => <span className="text-muted">{formatDate(locale, row.createdAt)}</span>,
    },
    {
      header: t('admin.directory.colRevoked'),
      cell: (row) => <span className="text-muted">{row.revokedAt ? formatDate(locale, row.revokedAt) : '—'}</span>,
    },
  ];

  const router = useRouter();
  const searchParams = useSearchParams();
  const access = parseAccess(searchParams.get('access'));
  const [search, setSearch] = useState(searchParams.get('club') ?? '');
  const clubQuery = searchTerm(useDebounced(search));

  const trainers = useAdminTrainers({ access, take: 20, ...(clubQuery ? { clubQuery } : {}) });

  // Keep the sent club search in the address. The comparison stops the loop:
  // once the URL holds the term, nothing changes.
  const urlClub = searchParams.get('club') ?? undefined;
  useEffect(() => {
    if (urlClub !== clubQuery) router.replace(directoryHref(access, clubQuery), { scroll: false });
  }, [urlClub, clubQuery, access, router]);

  const rows = trainers.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <TopBar crumbs={[{ label: t('admin.crumb') }, { label: t('nav.trainers') }]} />
      <PageBody>
        <PageHeader title={t('nav.trainers')} sub={t('admin.directory.sub')} />
        <Toolbar
          left={
            <SegmentedFilter
              label={t('admin.directory.accessFilter')}
              options={FILTERS.map((option) => ({ value: option.value, label: t(option.label) }))}
              value={access}
              onChange={(value) =>
                router.replace(directoryHref(value, clubQuery), { scroll: false })
              }
            />
          }
          right={
            <TextInput
              type="search"
              aria-label={t('admin.directory.search')}
              placeholder={t('admin.directory.search')}
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              className="w-[260px]"
            />
          }
        />
        {trainers.isPending ? (
          <LoadingState label={t('admin.trainers.loading')} />
        ) : trainers.isError ? (
          <ErrorState title={t('admin.trainers.loadFailed')} onRetry={() => void trainers.refetch()} />
        ) : (
          <Table
            caption={t('nav.trainers')}
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.id}
            empty={
              <EmptyState icon="users" title={t('admin.directory.empty')}>
                {t('admin.directory.emptyBody')}
              </EmptyState>
            }
            footer={
              trainers.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void trainers.fetchNextPage()}
                    disabled={trainers.isFetchingNextPage}
                  >
                    {trainers.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}
      </PageBody>
    </>
  );
}
