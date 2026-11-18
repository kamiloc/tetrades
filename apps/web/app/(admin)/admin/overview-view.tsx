'use client';

import { useAdminActions, useAdminOverview } from '@packages/api-client';
import type { AdminOverviewOutput } from '@packages/validators';
import Link from 'next/link';

import { buttonClasses } from '../../../components/button';
import { focusRing } from '../../../components/focus';
import { PageBody, PageHeader, Panel } from '../../../components/layout';
import { TopBar } from '../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../components/states';
import { formatDateTime, formatNumber } from '../../../lib/format';
import { useWebLocalization } from '../../../lib/i18n';
import type { MessageKey } from '../../../lib/translations';

import { ActivityList } from './activity/activity-entry';

interface Card {
  key: keyof Omit<AdminOverviewOutput, 'generatedAt'>;
  label: MessageKey;
  /** Null: shown as plain text (no cross-club invitation list exists). */
  href: string | null;
}

const CARDS: Card[] = [
  { key: 'activeClubs', label: 'admin.overview.activeClubs', href: '/admin/clubs?status=ACTIVE' },
  { key: 'deactivatedClubs', label: 'admin.overview.deactivatedClubs', href: '/admin/clubs?status=DEACTIVATED' },
  {
    key: 'activeClubsWithoutTrainer',
    label: 'admin.overview.activeClubsWithoutTrainer',
    href: '/admin/clubs?status=ACTIVE&trainers=none',
  },
  { key: 'activeTrainers', label: 'admin.overview.activeTrainers', href: '/admin/trainers?access=ACTIVE' },
  { key: 'pendingTrainerInvitations', label: 'admin.overview.pendingTrainerInvitations', href: null },
  { key: 'expiringTrainerInvitations', label: 'admin.overview.expiringTrainerInvitations', href: null },
];

const CARD = 'flex flex-col gap-1 rounded-[14px] border border-line bg-paper p-[18px] shadow-sm';

function CountCard({ card, value }: { card: Card; value: number }) {
  const { locale, t } = useWebLocalization();
  const body = (
    <>
      <span className="text-[28px] font-bold tabular-nums tracking-[-0.6px] text-text">
        {formatNumber(locale, value)}
      </span>
      <span className="text-[12.5px] font-medium text-muted">{t(card.label)}</span>
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
  const { t } = useWebLocalization();
  const actions = useAdminActions({ take: 5 });
  const entries = actions.data?.pages[0]?.items ?? [];
  return (
    <Panel
      title={t('admin.overview.recentActivity')}
      right={
        <Link
          href="/admin/activity"
          className={`text-[12.5px] font-semibold text-blue hover:underline ${focusRing}`}
        >
          {t('admin.overview.viewAll')}
        </Link>
      }
    >
      {actions.isPending ? (
        <LoadingState label={t('admin.activity.loading')} />
      ) : actions.isError ? (
        <ErrorState
          title={t('admin.overview.activityLoadFailed')}
          onRetry={() => void actions.refetch()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t('admin.overview.noActivity')}
          action={
            <Link href="/admin/clubs" className={buttonClasses('primary')}>
              {t('admin.overview.createClub')}
            </Link>
          }
        >
          {t('admin.overview.noActivityBody')}
        </EmptyState>
      ) : (
        <ActivityList entries={entries} />
      )}
    </Panel>
  );
}

export function OverviewView() {
  const { locale, t } = useWebLocalization();
  const overview = useAdminOverview();
  return (
    <>
      <TopBar crumbs={[{ label: t('admin.crumb') }, { label: t('nav.overview') }]} />
      <PageBody>
        <PageHeader
          title={t('nav.overview')}
          sub={
            overview.data
              ? t('admin.overview.updated', { date: formatDateTime(locale, overview.data.generatedAt) })
              : t('admin.overview.sub')
          }
        />
        {overview.isPending ? (
          <LoadingState label={t('admin.overview.loading')} />
        ) : overview.isError ? (
          <ErrorState
            title={t('admin.overview.loadFailed')}
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
