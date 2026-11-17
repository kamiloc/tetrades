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
import { ADMIN_ACTION_LABELS } from '../../../../lib/admin-actions';
import { withParams } from '../../../../lib/href';

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
      <TopBar crumbs={[{ label: 'Admin' }, { label: 'Activity' }]} />
      <PageBody>
        <PageHeader
          title="Activity"
          sub="Admin actions on clubs and trainer access, newest first, from every admin."
        />
        <Toolbar
          left={
            <>
              <Select
                aria-label="Action"
                value={action ?? ''}
                onChange={(event) => replace(parseAction(event.target.value), clubId)}
                className="w-[240px]"
              >
                <option value="">All actions</option>
                {adminActionEnum.options.map((value) => (
                  <option key={value} value={value}>
                    {ADMIN_ACTION_LABELS[value]}
                  </option>
                ))}
              </Select>
              {clubId ? (
                <Chip tone="blue">
                  Club: {clubName ?? 'Loading…'}
                  <button
                    type="button"
                    aria-label="Remove club filter"
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
        <Panel title="Admin actions">
          {actions.isPending ? (
            <LoadingState label="Loading activity…" />
          ) : actions.isError ? (
            <ErrorState
              title="We couldn't load the activity"
              onRetry={() => void actions.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState icon="activity" title="No admin actions match these filters" />
          ) : (
            <div className="flex flex-col gap-4">
              <ActivityList entries={rows} />
              {actions.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={() => void actions.fetchNextPage()}
                    disabled={actions.isFetchingNextPage}
                  >
                    {actions.isFetchingNextPage ? 'Loading…' : 'Load more'}
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
