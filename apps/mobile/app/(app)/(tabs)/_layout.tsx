import { trpc } from '@packages/api-client';
import { Tabs } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useMobileLocalization } from '../../../lib/i18n';
import { Feather, type IconName } from '../../../lib/icons';
import { colors } from '../../../lib/theme';

// Same query and page size as the Clubs tab, so both share one cache entry.
const MEMBERSHIP_PAGE_SIZE = 50;

function TabIcon({ name, focused, badge }: { name: IconName; focused: boolean; badge?: number }): ReactElement {
  const tint = focused ? colors.tabActive : colors.tabInactive;
  return (
    <View className="h-6 w-8 items-center justify-center">
      <Feather name={name} size={22} color={tint} />
      {badge ? (
        <View
          className="absolute -right-2 -top-1 h-4 min-w-4 items-center justify-center rounded-pill border-paper bg-blue px-1"
          style={{ borderWidth: 1.5 }}
        >
          <Text className="text-badge font-bold text-paper">{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Badge count only once every page has loaded and the count is positive
// (hidden while loading, on error, and at zero). Pending invitations can sit
// on any page, so a partial count would undercount.
function usePendingInvitationCount(): number {
  const memberships = trpc.club.listMyMemberships.useInfiniteQuery(
    { take: MEMBERSHIP_PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = memberships;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);
  if (!memberships.isSuccess || hasNextPage) return 0;
  return memberships.data.pages
    .flatMap((page) => page.items)
    .filter((m) => m.status === 'PENDING_ATHLETE_CONFIRMATION').length;
}

function tabLabel(label: string) {
  return function TabLabel({ focused }: { focused: boolean }): ReactElement {
    return (
      <Text
        className={focused ? 'text-tab-label font-bold text-tab-active' : 'text-tab-label text-tab-inactive'}
      >
        {label}
      </Text>
    );
  };
}

export default function TabsLayout(): ReactElement {
  const { t } = useMobileLocalization();
  const pendingInvitations = usePendingInvitationCount();

  return (
    <Tabs
      initialRouteName="profile"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.select({ ios: 98, android: 64 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, android: 8 }),
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarLabel: tabLabel(t('tabs.profile')),
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: t('tabs.connections'),
          tabBarAccessibilityLabel: t('tabs.connections'),
          tabBarLabel: tabLabel(t('tabs.connections')),
          // No badge until a pending-request listing exists (proposal: UI-only Connections).
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: t('tabs.performance'),
          tabBarAccessibilityLabel: t('tabs.performance'),
          tabBarLabel: tabLabel(t('tabs.performance')),
          tabBarIcon: ({ focused }) => <TabIcon name="activity" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: t('tabs.clubs'),
          tabBarAccessibilityLabel:
            pendingInvitations > 0 ? t('tabs.clubsWithInvitations', { count: pendingInvitations }) : t('tabs.clubs'),
          tabBarLabel: tabLabel(t('tabs.clubs')),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="flag" focused={focused} badge={pendingInvitations > 0 ? pendingInvitations : undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
