import { useMyClubMemberships } from '@packages/api-client';
import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Feather, type IconName } from '../../../lib/icons';
import { colors } from '../../../lib/theme';

// Pending invitations are a small subset of memberships; the first page
// (server max 50) is enough for the badge. The Clubs tab pages the rest.
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

// Badge count only when the query succeeded and the count is positive
// (hidden while loading, on error, and at zero).
function usePendingInvitationCount(): number {
  const memberships = useMyClubMemberships({ take: MEMBERSHIP_PAGE_SIZE });
  if (!memberships.isSuccess) return 0;
  return memberships.data.items.filter((m) => m.status === 'PENDING_ATHLETE_CONFIRMATION').length;
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
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarLabel: tabLabel('Profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarAccessibilityLabel: 'Connections',
          tabBarLabel: tabLabel('Connections'),
          // No badge until a pending-request listing exists (proposal: UI-only Connections).
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarAccessibilityLabel: 'Performance',
          tabBarLabel: tabLabel('Performance'),
          tabBarIcon: ({ focused }) => <TabIcon name="activity" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          tabBarAccessibilityLabel:
            pendingInvitations > 0 ? `Clubs, ${pendingInvitations} pending invitations` : 'Clubs',
          tabBarLabel: tabLabel('Clubs'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="flag" focused={focused} badge={pendingInvitations > 0 ? pendingInvitations : undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
