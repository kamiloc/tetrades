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
import { searchTerm, useDebounced } from '../../../../lib/use-debounced';

const FILTERS: { value: AdminTrainerAccessFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLUB_DEACTIVATED', label: 'Club deactivated' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ALL', label: 'All' },
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

const COLUMNS: Column<AdminTrainerDirectoryEntryOutput>[] = [
  {
    header: 'Club',
    className: 'w-[32%]',
    cell: (t) => (
      <Link
        href={`/admin/clubs/${t.club.id}/trainers`}
        className={`flex min-w-0 items-center gap-2 rounded-sm hover:underline ${focusRing}`}
      >
        <NameCell title={t.club.name} sub={t.club.slug} />
        {t.club.isActive ? null : <StatusChip status="deactivated" />}
      </Link>
    ),
  },
  {
    header: 'Invited as',
    className: 'w-[28%]',
    cell: (t) =>
      t.invitedEmail === null ? (
        <span className="text-muted">Provisioned before invitations</span>
      ) : (
        <span className="block truncate">{t.invitedEmail}</span>
      ),
  },
  { header: 'Access', cell: (t) => <StatusChip status={ACCESS_CHIP[t.access]} /> },
  { header: 'Added', cell: (t) => <span className="text-muted">{formatDate(t.createdAt)}</span> },
  {
    header: 'Revoked',
    cell: (t) => <span className="text-muted">{t.revokedAt ? formatDate(t.revokedAt) : '—'}</span>,
  },
];

function directoryHref(access: AdminTrainerAccessFilter, club: string | undefined): string {
  return withParams('/admin/trainers', { access: access === 'ACTIVE' ? undefined : access, club });
}

export function TrainersDirectoryView() {
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
      <TopBar crumbs={[{ label: 'Admin' }, { label: 'Trainers' }]} />
      <PageBody>
        <PageHeader
          title="Trainers"
          sub="Every trainer assignment across clubs, newest first. Revoke from the club's trainers page."
        />
        <Toolbar
          left={
            <SegmentedFilter
              label="Trainer access"
              options={FILTERS}
              value={access}
              onChange={(value) =>
                router.replace(directoryHref(value, clubQuery), { scroll: false })
              }
            />
          }
          right={
            <TextInput
              type="search"
              aria-label="Search by club name"
              placeholder="Search by club name"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              className="w-[260px]"
            />
          }
        />
        {trainers.isPending ? (
          <LoadingState label="Loading trainers…" />
        ) : trainers.isError ? (
          <ErrorState
            title="We couldn't load the trainers"
            onRetry={() => void trainers.refetch()}
          />
        ) : (
          <Table
            caption="Trainers"
            columns={COLUMNS}
            rows={rows}
            rowKey={(t) => t.id}
            empty={
              <EmptyState icon="users" title="No trainers match these filters">
                Trainers join a club by accepting an invitation from its trainers page.
              </EmptyState>
            }
            footer={
              trainers.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void trainers.fetchNextPage()}
                    disabled={trainers.isFetchingNextPage}
                  >
                    {trainers.isFetchingNextPage ? 'Loading…' : 'Load more'}
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
