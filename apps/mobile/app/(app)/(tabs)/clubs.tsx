import { trpc, useLeaveClub, useRespondToClubInvitation } from '@packages/api-client';
import { clubActivityChip, partitionMemberships, selectViewState } from '@packages/shared-logic';
import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { EmptyRow } from '../../../components/EmptyRow';
import { PillButton } from '../../../components/PillButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SectionTitle } from '../../../components/SectionTitle';
import { TabSkeleton } from '../../../components/Skeleton';
import { StatePanel } from '../../../components/StatePanel';
import { StatusChip } from '../../../components/StatusChip';
import { Tag } from '../../../components/Tag';
import { useToast } from '../../../components/Toast';
import { formatDate } from '../../../lib/format';
import { useMobileLocalization } from '../../../lib/i18n';
import { mutationErrorMessage, type ErrorCopy } from '../../../lib/mutation-errors';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

const PAGE_SIZE = 50;

// "Inactive club" label for a deactivated club (ADR-017); nothing when active.
function InactiveClubChip({ isActive }: { isActive: boolean }): ReactElement | null {
  const { t } = useMobileLocalization();
  const chip = clubActivityChip({ isActive });
  return chip === null ? null : (
    <Chip label={t('status.inactiveClub')} tone={chip.tone} icon={chip.icon} accessibilityLabel={t('status.inactiveClub.a11y')} small />
  );
}

export default function ClubsScreen(): ReactElement {
  const { locale, t } = useMobileLocalization();
  const monthYear = (date: Date): string => formatDate(locale, date, 'monthYear');
  const respondErrors: ErrorCopy = {
    BAD_REQUEST: t('clubs.respond.badRequest'),
    CONFLICT: t('clubs.respond.conflict'),
    NOT_FOUND: t('clubs.respond.notFound'),
    fallback: t('clubs.respond.fallback'),
  };
  const leaveErrors: ErrorCopy = {
    BAD_REQUEST: t('clubs.leaveError.badRequest'),
    CONFLICT: t('clubs.leaveError.conflict'),
    NOT_FOUND: t('clubs.leaveError.notFound'),
    fallback: t('clubs.leaveError.fallback'),
  };
  const utils = trpc.useUtils();
  const memberships = trpc.club.listMyMemberships.useInfiniteQuery(
    { take: PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );
  const respond = useRespondToClubInvitation();
  const leave = useLeaveClub();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = useMemo(() => memberships.data?.pages.flatMap((p) => p.items) ?? [], [memberships.data]);
  const { invitations, active, history } = useMemo(() => partitionMemberships(all), [all]);

  const state = selectViewState({
    isLoading: isBusy(memberships),
    isError: isFailed(memberships),
    isEmpty: invitations.length === 0 && active.length === 0 && history.length === 0,
  });

  const refresh = async (): Promise<void> => {
    await utils.club.listMyMemberships.invalidate();
  };

  const sendResponse = (membershipId: string, clubName: string, status: 'ACTIVE' | 'REJECTED'): void => {
    setBusyId(membershipId);
    respond.mutate(
      { membershipId, status },
      {
        onSuccess: () => {
          toast.success(t(status === 'ACTIVE' ? 'clubs.joined' : 'clubs.declined', { club: clubName }));
          void refresh();
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error, respondErrors));
          void refresh();
        },
        onSettled: () => setBusyId(null),
      },
    );
  };

  const confirmDecline = (membershipId: string, clubName: string): void => {
    Alert.alert(t('clubs.declineTitle', { club: clubName }), t('clubs.declineBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.decline'), style: 'destructive', onPress: () => sendResponse(membershipId, clubName, 'REJECTED') },
    ]);
  };

  const confirmLeave = (membershipId: string, clubName: string): void => {
    Alert.alert(
      t('clubs.leaveTitle', { club: clubName }),
      t('clubs.leaveBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('clubs.leave'),
          style: 'destructive',
          onPress: () => {
            setBusyId(membershipId);
            leave.mutate(
              { membershipId },
              {
                onSuccess: () => {
                  toast.success(t('clubs.left', { club: clubName }));
                  void refresh();
                  void utils.achievement.listMyCertificationRequests.invalidate();
                  void utils.achievement.listAchievements.invalidate();
                },
                onError: (error) => {
                  toast.error(mutationErrorMessage(error, leaveErrors));
                  void refresh();
                },
                onSettled: () => setBusyId(null),
              },
            );
          },
        },
      ],
    );
  };

  // Loaded subtitle, e.g. "2 active clubs · 1 invitation".
  const loadedSubtitle =
    invitations.length > 0
      ? `${t('clubs.activeCount', { count: active.length })} · ${t('clubs.invitationCount', { count: invitations.length })}`
      : t('clubs.activeCount', { count: active.length });
  const subtitle =
    state === 'error' ? t('common.offline') : state === 'loaded' ? loadedSubtitle : t('clubs.sub.empty');

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title={t('clubs.title')} subtitle={subtitle} />
      {state === 'loading' ? (
        <TabSkeleton variant="list" />
      ) : state === 'error' ? (
        <View className="px-4 pt-4">
          <StatePanel
            tone="danger"
            icon="wifi-off"
            title={t('common.offline')}
            body={t('clubs.error.body')}
            primary={{ label: t('common.tryAgain'), onPress: () => { void memberships.refetch(); } }}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (nearEnd && memberships.hasNextPage && !memberships.isFetchingNextPage) void memberships.fetchNextPage();
          }}
          scrollEventThrottle={200}
        >
          {state === 'empty' ? (
            <View className="px-4 pt-4">
              <StatePanel
                icon="flag"
                title={t('clubs.empty.title')}
                body={t('clubs.empty.body')}
                primary={{ label: t('clubs.viewInvitations'), onPress: () => { void memberships.refetch(); } }}
                secondary={{ label: t('common.manageVisibility'), onPress: () => router.push('/visibility') }}
              />
            </View>
          ) : null}

          {/* Club invitations: only the athlete's explicit acceptance activates a membership */}
          <View className="px-4 pt-4">
            <SectionTitle>{t('clubs.invitationsSection')}</SectionTitle>
            <Card>
              {invitations.length === 0 ? (
                <EmptyRow icon="users">{t('clubs.noInvitations')}</EmptyRow>
              ) : (
                invitations.map((m, index) => (
                  <View key={m.id} className={`p-3.5 ${index === invitations.length - 1 ? '' : 'border-b border-line'}`}>
                    <View className="flex-row items-center gap-3">
                      <Avatar name={m.club.name} size={40} />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-row-title text-text">{m.club.name}</Text>
                          <InactiveClubChip isActive={m.club.isActive} />
                        </View>
                        <Text className="mt-0.5 text-meta text-muted">{t('clubs.invited', { date: monthYear(m.createdAt) })}</Text>
                      </View>
                      <StatusChip status="PENDING" small />
                    </View>
                    <Text className="mt-2.5 text-meta text-muted">{t('clubs.invitationExplainer')}</Text>
                    <View className="mt-3 flex-row gap-2">
                      <PillButton
                        label={t('common.accept')}
                        onPress={() => sendResponse(m.id, m.club.name, 'ACTIVE')}
                        loading={busyId === m.id && respond.isPending}
                        disabled={busyId !== null}
                      />
                      <PillButton
                        label={t('common.decline')}
                        variant="ghost"
                        onPress={() => confirmDecline(m.id, m.club.name)}
                        disabled={busyId !== null}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>
          </View>

          {active.length > 0 || history.length > 0 ? (
            <View className="px-4 pt-5">
              <SectionTitle>{t('clubs.history')}</SectionTitle>
              <Card className="px-4 py-1">
                {[...active, ...history].map((m, index, rows) => {
                  const current = m.status === 'ACTIVE';
                  const since = m.respondedAt ?? m.createdAt;
                  return (
                    <View
                      key={m.id}
                      className={`flex-row gap-3 py-3.5 ${index === rows.length - 1 ? '' : 'border-b border-line'}`}
                    >
                      <View
                        className="mt-1 h-2.5 w-2.5 rounded-pill"
                        style={{
                          backgroundColor: current ? colors.blue : colors.subtle,
                          ...(current ? { borderWidth: 3, borderColor: colors.blueTint, width: 16, height: 16, marginTop: 1 } : {}),
                        }}
                      />
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-row-title text-text">{m.club.name}</Text>
                          {current ? <Tag tone="blue">{t('clubs.current')}</Tag> : null}
                          {/* Leave stays available for an ACTIVE membership of an inactive club. */}
                          <InactiveClubChip isActive={m.club.isActive} />
                        </View>
                        <Text className="mt-[3px] text-meta text-muted">
                          {current
                            ? t('clubs.periodCurrent', { start: monthYear(since) })
                            : t('clubs.periodEnded', { start: monthYear(since), end: m.endedAt ? monthYear(m.endedAt) : t('clubs.ended') })}
                        </Text>
                      </View>
                      {current ? (
                        <Pressable
                          onPress={() => confirmLeave(m.id, m.club.name)}
                          disabled={busyId !== null}
                          accessibilityRole="button"
                          accessibilityLabel={t('clubs.leaveLabel', { club: m.club.name })}
                          className="min-h-[44px] justify-center px-1"
                        >
                          <Text className="text-cta text-muted">{busyId === m.id && leave.isPending ? t('clubs.leaving') : t('clubs.leave')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
