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
import { useCurrentClub, useRefreshOnLostAccess } from '../../../../../../lib/trainer/use-trainer';
import { LoadMore } from '../../../_components/load-more';

import { InviteAthleteDialog } from './invite-athlete-dialog';

export function athletePath(clubId: string, athleteId: string): string {
  return `/trainer/clubs/${clubId}/athletes/${athleteId}`;
}

function columns(clubId: string): Column<ClubRosterEntryOutput>[] {
  return [
    {
      header: 'Athlete',
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
    { header: 'Sport', cell: (row) => <span className="text-muted">{row.athlete.sport.name}</span> },
    {
      header: 'Status',
      cell: (row) => (
        <StatusChip status={row.status === 'ACTIVE' ? 'active' : 'waitingAthlete'} />
      ),
    },
    {
      header: 'Since',
      cell: (row) => (
        <span className="text-muted">
          {row.status === 'ACTIVE'
            ? `Joined ${formatDate(row.respondedAt ?? row.createdAt)}`
            : `Invited ${formatDate(row.createdAt)}`}
        </span>
      ),
    },
  ];
}

export function RosterView({ clubId }: { clubId: string }) {
  const { club } = useCurrentClub(clubId);
  const roster = trpc.club.listRoster.useInfiniteQuery(
    { clubId, take: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const lostAccess = useRefreshOnLostAccess(roster.error);
  const [inviting, setInviting] = useState(false);
  const rows = roster.data?.pages.flatMap((page) => page.items) ?? [];
  const clubName = club?.name ?? 'Club';

  const inviteButton = (
    <Button variant="primary" icon="plus" onClick={() => setInviting(true)}>
      Invite athlete
    </Button>
  );

  return (
    <>
      <TopBar
        crumbs={[{ label: clubName, href: `/trainer/clubs/${clubId}/athletes` }, { label: 'Athletes' }]}
        action={inviteButton}
      />
      <PageBody>
        <PageHeader
          title="Athletes"
          sub="Active athletes, and the invitations you sent that are still waiting for the athlete."
        />
        {roster.isPending || lostAccess ? (
          <LoadingState label="Loading athletes…" />
        ) : roster.isError ? (
          <ErrorState title="We couldn't load the athletes" onRetry={() => void roster.refetch()} />
        ) : (
          <>
            <Table
              caption={`Athletes of ${clubName}`}
              columns={columns(clubId)}
              rows={rows}
              rowKey={(row) => row.id}
              empty={
                <EmptyState icon="users" title="No athletes yet" action={inviteButton}>
                  Invite an athlete with their profile link or by name. They join the club when
                  they confirm.
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
        clubName={club?.name ?? 'this club'}
      />
    </>
  );
}
