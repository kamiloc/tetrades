import { trpc, useLeaveClub, useRespondToClubInvitation } from '@packages/api-client';
import { TAB_STATES, clubsSubtitle, partitionMemberships, selectViewState } from '@packages/shared-logic';
import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { EmptyRow } from '../../../components/EmptyRow';
import { PillButton } from '../../../components/PillButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SectionTitle } from '../../../components/SectionTitle';
import { TabSkeleton } from '../../../components/Skeleton';
import { StatePanel } from '../../../components/StatePanel';
import { StatusChip } from '../../../components/StatusChip';
import { Tag } from '../../../components/Tag';
import { useToast } from '../../../components/Toast';
import { mutationErrorMessage } from '../../../lib/mutation-errors';
import { isBusy, isFailed } from '../../../lib/query-state';
import { colors } from '../../../lib/theme';

const copy = TAB_STATES.clubs;
const PAGE_SIZE = 50;

const monthYear = (date: Date): string => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const RESPOND_ERRORS = {
  BAD_REQUEST: 'This invitation is no longer pending.',
  CONFLICT: 'This invitation was already answered. Refreshing your clubs.',
  NOT_FOUND: 'This invitation no longer exists.',
  fallback: "Couldn't send your response. Try again.",
};

const LEAVE_ERRORS = {
  BAD_REQUEST: 'This membership is no longer active.',
  CONFLICT: 'This membership already changed. Refreshing your clubs.',
  NOT_FOUND: 'This membership no longer exists.',
  fallback: "Couldn't leave the club. Try again.",
};

export default function ClubsScreen(): ReactElement {
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
    isEmpty: invitations.length === 0 && active.length === 0,
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
          toast.success(status === 'ACTIVE' ? `You joined ${clubName}` : `Invitation from ${clubName} declined`);
          void refresh();
        },
        onError: (error) => {
          toast.error(mutationErrorMessage(error, RESPOND_ERRORS));
          void refresh();
        },
        onSettled: () => setBusyId(null),
      },
    );
  };

  const confirmDecline = (membershipId: string, clubName: string): void => {
    Alert.alert(`Decline ${clubName}?`, "The club won't be able to report your metrics or certify your achievements.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => sendResponse(membershipId, clubName, 'REJECTED') },
    ]);
  };

  const confirmLeave = (membershipId: string, clubName: string): void => {
    Alert.alert(
      `Leave ${clubName}?`,
      "Its trainers will no longer be able to report your metrics, and any open certification requests to this club will be cancelled. Verified achievements stay verified.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            setBusyId(membershipId);
            leave.mutate(
              { membershipId },
              {
                onSuccess: () => {
                  toast.success(`You left ${clubName}`);
                  void refresh();
                  void utils.achievement.listMyCertificationRequests.invalidate();
                  void utils.achievement.listAchievements.invalidate();
                },
                onError: (error) => {
                  toast.error(mutationErrorMessage(error, LEAVE_ERRORS));
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

  const subtitle =
    state === 'error' ? copy.sub.error : state === 'loaded' ? clubsSubtitle(active.length, invitations.length) : copy.sub.empty;

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Clubs & trainers" subtitle={subtitle} />
      {state === 'loading' ? (
        <TabSkeleton variant="list" />
      ) : state === 'error' ? (
        <View className="px-4 pt-4">
          <StatePanel
            tone="danger"
            icon="wifi-off"
            title={copy.error.title}
            body={copy.error.body}
            primary={{ label: copy.error.primary, onPress: () => { void memberships.refetch(); } }}
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
                title={copy.empty.title}
                body={copy.empty.body}
                primary={{ label: copy.empty.primary, onPress: () => { void memberships.refetch(); } }}
                secondary={{ label: copy.empty.secondary, onPress: () => router.push('/visibility') }}
              />
            </View>
          ) : null}

          {/* Club invitations: only the athlete's explicit acceptance activates a membership */}
          <View className="px-4 pt-4">
            <SectionTitle>Club invitations</SectionTitle>
            <Card>
              {invitations.length === 0 ? (
                <EmptyRow icon="users">{copy.emptyRows.invitations ?? 'No club invitations'}</EmptyRow>
              ) : (
                invitations.map((m, index) => (
                  <View key={m.id} className={`p-3.5 ${index === invitations.length - 1 ? '' : 'border-b border-line'}`}>
                    <View className="flex-row items-center gap-3">
                      <Avatar name={m.club.name} size={40} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-row-title text-text">{m.club.name}</Text>
                        <Text className="mt-0.5 text-meta text-muted">Invited {monthYear(m.createdAt)}</Text>
                      </View>
                      <StatusChip status="PENDING" small />
                    </View>
                    <Text className="mt-2.5 text-meta text-muted">
                      If you accept, this club's trainers can report your performance metrics and review certification
                      requests you send them. They can't see your private details.
                    </Text>
                    <View className="mt-3 flex-row gap-2">
                      <PillButton
                        label="Accept"
                        onPress={() => sendResponse(m.id, m.club.name, 'ACTIVE')}
                        loading={busyId === m.id && respond.isPending}
                        disabled={busyId !== null}
                      />
                      <PillButton
                        label="Decline"
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
              <SectionTitle>Club history</SectionTitle>
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
                        <View className="flex-row items-center gap-2">
                          <Text className="text-row-title text-text">{m.club.name}</Text>
                          {current ? <Tag tone="blue">Current</Tag> : null}
                        </View>
                        <Text className="mt-[3px] text-meta text-muted">
                          {current
                            ? `${monthYear(since)} – present`
                            : `${monthYear(since)} – ${m.endedAt ? monthYear(m.endedAt) : 'ended'}`}
                        </Text>
                      </View>
                      {current ? (
                        <Pressable
                          onPress={() => confirmLeave(m.id, m.club.name)}
                          disabled={busyId !== null}
                          accessibilityRole="button"
                          accessibilityLabel={`Leave ${m.club.name}`}
                          className="min-h-[44px] justify-center px-1"
                        >
                          <Text className="text-cta text-muted">{busyId === m.id && leave.isPending ? 'Leaving…' : 'Leave'}</Text>
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
