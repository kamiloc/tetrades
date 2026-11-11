'use client';

import { useAdminActions, useAdminOverview } from '@packages/api-client';
import type { AdminOverviewOutput } from '@packages/validators';
import Link from 'next/link';

import { buttonClasses } from '../../../components/button';
import { focusRing } from '../../../components/focus';
import { PageBody, PageHeader, Panel } from '../../../components/layout';
import { TopBar } from '../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../components/states';
import { formatDateTime } from '../../../lib/format';

import { ActivityList } from './activity/activity-entry';

interface Card {
  key: keyof Omit<AdminOverviewOutput, 'generatedAt'>;
  label: string;
  /** Null: shown as plain text (no cross-club invitation list exists). */
  href: string | null;
}

const CARDS: Card[] = [
  { key: 'activeClubs', label: 'Active clubs', href: '/admin/clubs?status=ACTIVE' },
  { key: 'deactivatedClubs', label: 'Deactivated clubs', href: '/admin/clubs?status=DEACTIVATED' },
  {
    key: 'activeClubsWithoutTrainer',
    label: 'Active clubs with no active trainer',
    href: '/admin/clubs?status=ACTIVE&trainers=none',
  },
  { key: 'activeTrainers', label: 'Active trainers', href: '/admin/trainers?access=ACTIVE' },
  { key: 'pendingTrainerInvitations', label: 'Pending trainer invitations', href: null },
  { key: 'expiringTrainerInvitations', label: 'Invitations expiring within 48 hours', href: null },
];

const CARD = 'flex flex-col gap-1 rounded-[14px] border border-line bg-paper p-[18px] shadow-sm';

function CountCard({ card, value }: { card: Card; value: number }) {
  const body = (
    <>
      <span className="text-[28px] font-bold tabular-nums tracking-[-0.6px] text-text">
        {value}
      </span>
      <span className="text-[12.5px] font-medium text-muted">{card.label}</span>
    </>
  );
  return card.href === null ? (
    <div className={CARD}>{body}</div>
  ) : (
    <Link href={card.href} className={`${CARD} hover:border-blue-line ${focusRing}`}>
      {body}
    </Link>
  );
}

function RecentActivity() {
  const actions = useAdminActions({ take: 5 });
  const entries = actions.data?.pages[0]?.items ?? [];
  return (
    <Panel
      title="Recent activity"
      right={
        <Link
          href="/admin/activity"
          className={`text-[12.5px] font-semibold text-blue hover:underline ${focusRing}`}
        >
          View all
        </Link>
      }
    >
      {actions.isPending ? (
        <LoadingState label="Loading activity…" />
      ) : actions.isError ? (
        <ErrorState
          title="We couldn't load recent activity"
          onRetry={() => void actions.refetch()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No admin actions yet"
          action={
            <Link href="/admin/clubs" className={buttonClasses('primary')}>
              Create a club
            </Link>
          }
        >
          Club and trainer changes made by admins appear here.
        </EmptyState>
      ) : (
        <ActivityList entries={entries} />
      )}
    </Panel>
  );
}

export function OverviewView() {
  const overview = useAdminOverview();
  return (
    <>
      <TopBar crumbs={[{ label: 'Admin' }, { label: 'Overview' }]} />
      <PageBody>
        <PageHeader
          title="Overview"
          sub={
            overview.data
              ? `Updated ${formatDateTime(overview.data.generatedAt)}`
              : 'Clubs, trainers and invitations across the platform.'
          }
        />
        {overview.isPending ? (
          <LoadingState label="Loading overview…" />
        ) : overview.isError ? (
          <ErrorState
            title="We couldn't load the overview"
            onRetry={() => void overview.refetch()}
          />
        ) : (
          <div className="grid grid-cols-3 gap-[18px]">
            {CARDS.map((card) => (
              <CountCard key={card.key} card={card} value={overview.data[card.key]} />
            ))}
          </div>
        )}
        <RecentActivity />
      </PageBody>
    </>
  );
}
