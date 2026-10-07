// apps/mobile/app/(tabs)/_layout.tsx
// Athlete Passport — four-tab navigation shell (Expo Router).
//
// Fixed order: Profile · Connections · Performance · Clubs.
// Icons: Feather user · users · activity · flag.
// Connections badge uses useConnections().pendingCount; Clubs uses
// useClubs().requestCount. Hide the relevant badge when its hook is loading,
// errored, empty, or the count is 0. See the Data states section in README.

import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, layout, text as textStyle } from '@/tokens';
import { useConnections, useClubs } from '@/lib/hooks';

function TabIcon({
  name, focused, badge,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  focused: boolean;
  badge?: number;
}) {
  const tint = focused ? colors.tabActive : colors.tabInactive;
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={24} color={tint} />
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const connections = useConnections();
  const clubs = useClubs();
  const connectionsEmpty = !connections.isLoading && !connections.error && !connections.data?.length;
  const clubsEmpty = !clubs.isLoading && !clubs.error && !clubs.data?.length;
  const connectionsBadge = connections.isLoading || connections.error || connectionsEmpty || connections.pendingCount === 0
    ? undefined : connections.pendingCount;
  const clubsBadge = clubs.isLoading || clubs.error || clubsEmpty || clubs.requestCount === 0
    ? undefined : clubs.requestCount;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.select({ ios: layout.tabBarHeight + 20, android: layout.tabBarHeight }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, android: 8 }),
        },
        tabBarLabelStyle: textStyle.tabLabel,
      }}
    >
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
      }} />
      <Tabs.Screen name="connections" options={{
        title: 'Connections',
        tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} badge={connectionsBadge} />,
      }} />
      <Tabs.Screen name="performance" options={{
        title: 'Performance',
        tabBarIcon: ({ focused }) => <TabIcon name="activity" focused={focused} />,
      }} />
      <Tabs.Screen name="clubs" options={{
        title: 'Clubs',
        tabBarIcon: ({ focused }) => <TabIcon name="flag" focused={focused} badge={clubsBadge} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 32, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 999,
    backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
