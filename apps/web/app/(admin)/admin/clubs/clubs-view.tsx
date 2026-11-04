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

import { ClubFormDialog } from './club-form-dialog';

const FILTERS: { value: AdminClubStatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
  { value: 'ALL', label: 'All' },
];

const EMPTY_COPY: Record<AdminClubStatusFilter, string> = {
  ACTIVE: 'No active clubs yet.',
  DEACTIVATED: 'No deactivated clubs.',
  ALL: 'No clubs yet.',
};

function parseFilter(value: string | null): AdminClubStatusFilter {
  return value === 'DEACTIVATED' || value === 'ALL' ? value : 'ACTIVE';
}

const COLUMNS: Column<AdminClubOutput>[] = [
  {
    header: 'Club',
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
    header: 'Location',
    cell: (club) => (
      <span className="text-muted">
        {club.city ? `${club.city}, ${club.countryCode}` : club.countryCode}
      </span>
    ),
  },
  {
    header: 'Status',
    cell: (club) => <StatusChip status={club.isActive ? 'active' : 'deactivated'} />,
  },
  {
    header: 'Active trainers',
    align: 'right',
    cell: (club) => <span className="font-semibold tabular-nums">{club.activeTrainerCount}</span>,
  },
];

export function ClubsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('status'));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

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
      Create club
    </Button>
  );

  return (
    <>
      <TopBar crumbs={[{ label: 'Admin' }, { label: 'Clubs' }]} action={createButton} />
      <PageBody>
        <PageHeader title="Clubs" sub="Newest first. Deactivated clubs keep their history." />
        {created ? (
          <InlineAlert
            tone="success"
            title={`${created.name} was created`}
            action={
              <Button size="sm" variant="link" onClick={() => setCreated(null)}>
                Dismiss
              </Button>
            }
          >
            <Link
              href={`/admin/clubs/${created.id}/trainers`}
              className={`rounded-sm text-blue hover:underline ${focusRing}`}
            >
              Invite its trainers
            </Link>
          </InlineAlert>
        ) : null}
        <Toolbar
          left={
            <SegmentedFilter
              label="Club status"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          }
        />
        {clubs.isPending ? (
          <LoadingState label="Loading clubs…" />
        ) : clubs.isError ? (
          <ErrorState title="We couldn't load the clubs" onRetry={() => void clubs.refetch()} />
        ) : (
          <Table
            caption="Clubs"
            columns={COLUMNS}
            rows={rows}
            rowKey={(club) => club.id}
            empty={
              <EmptyState title={EMPTY_COPY[filter]} action={createButton}>
                Clubs you create appear here. Trainers can join a club only by invitation.
              </EmptyState>
            }
            footer={
              clubs.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void clubs.fetchNextPage()}
                    disabled={clubs.isFetchingNextPage}
                  >
                    {clubs.isFetchingNextPage ? 'Loading…' : 'Load more'}
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
