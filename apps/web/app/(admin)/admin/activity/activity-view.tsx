'use client';

import { trpc, useAdminActions } from '@packages/api-client';
import { adminActionEnum, cuidSchema, type AdminAction } from '@packages/validators';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '../../../../components/button';
import { Select } from '../../../../components/field';
import { Icon } from '../../../../components/icon';
import { PageBody, PageHeader, Panel, Toolbar } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/states';
import { Chip } from '../../../../components/status-chip';
import { adminActionLabel } from '../../../../lib/admin-actions';
import { withParams } from '../../../../lib/href';
import { useWebLocalization } from '../../../../lib/i18n';

import { ActivityList } from './activity-entry';

function parseAction(value: string | null): AdminAction | undefined {
  const parsed = adminActionEnum.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

// An invalid id is ignored rather than sent (it would only fail validation).
function parseClub(value: string | null): string | undefined {
  const parsed = cuidSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function activityHref(action: AdminAction | undefined, club: string | undefined): string {
  return withParams('/admin/activity', { action, club });
}

export function ActivityView() {
  const { t } = useWebLocalization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = parseAction(searchParams.get('action'));
  const clubId = parseClub(searchParams.get('club'));

  const actions = useAdminActions({
    take: 20,
    ...(action ? { action } : {}),
    ...(clubId ? { clubId } : {}),
  });
  const rows = actions.data?.pages.flatMap((page) => page.items) ?? [];

  // The filter chip's club name: from the first row when it has one,
  // otherwise from the club itself.
  const nameFromRows = rows.find((r) => r.club?.id === clubId)?.club?.name;
  const club = trpc.admin.getClub.useQuery(
    { clubId: clubId ?? '' },
    { enabled: clubId !== undefined && nameFromRows === undefined && !actions.isPending },
  );
  const clubName = nameFromRows ?? club.data?.name;

  const replace = (nextAction: AdminAction | undefined, nextClub: string | undefined) =>
    router.replace(activityHref(nextAction, nextClub), { scroll: false });

  return (
    <>
      <TopBar crumbs={[{ label: t('admin.crumb') }, { label: t('nav.activity') }]} />
      <PageBody>
        <PageHeader title={t('nav.activity')} sub={t('admin.activity.sub')} />
        <Toolbar
          left={
            <>
              <Select
                aria-label={t('admin.activity.actionFilter')}
                value={action ?? ''}
                onChange={(event) => replace(parseAction(event.target.value), clubId)}
                className="w-[240px]"
              >
                <option value="">{t('admin.activity.allActions')}</option>
                {adminActionEnum.options.map((value) => (
                  <option key={value} value={value}>
                    {t(adminActionLabel(value))}
                  </option>
                ))}
              </Select>
              {clubId ? (
                <Chip tone="blue">
                  {t('admin.activity.clubFilter', { club: clubName ?? t('common.loading') })}
                  <button
                    type="button"
                    aria-label={t('admin.activity.removeClubFilter')}
                    className="ml-1 rounded-sm"
                    onClick={() => replace(action, undefined)}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </Chip>
              ) : null}
            </>
          }
        />
        <Panel title={t('admin.activity.panel')}>
          {actions.isPending ? (
            <LoadingState label={t('admin.activity.loading')} />
          ) : actions.isError ? (
            <ErrorState title={t('admin.activity.loadFailed')} onRetry={() => void actions.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon="activity" title={t('admin.activity.empty')} />
          ) : (
            <div className="flex flex-col gap-4">
              <ActivityList entries={rows} />
              {actions.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void actions.fetchNextPage()}
                    disabled={actions.isFetchingNextPage}
                  >
                    {actions.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </PageBody>
    </>
  );
}
