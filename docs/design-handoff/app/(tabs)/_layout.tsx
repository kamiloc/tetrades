// apps/mobile/app/(tabs)/_layout.tsx
// Athlete Passport — bottom-tab navigation (Expo Router).
//
// Tab order is FIXED (per product spec):
//   1. Profile  2. Connections  3. Documents  4. Search
//
// Notes for the implementer:
// - Icons use @expo/vector-icons (Feather), bundled with Expo.
// - The dark app header is NOT part of the tab bar — implement it as a
//   reusable <ScreenHeader> component rendered inside each screen, so each
//   tab can decide its own title/subtitle without fighting the router.
// - The notification badge (3) on Connections and the lock indicator on
//   Documents come from app state; the values below are placeholders.

import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, layout, text as textStyle } from '@/tokens';

// ─── Custom badge / lock decorator over a tab icon ───────────────────
function TabIcon({
  name, focused, badge, locked,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  focused: boolean;
  badge?: number;
  locked?: boolean;
}) {
  const tint = focused ? colors.tabActive : colors.tabInactive;
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={24} color={tint} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {locked ? (
        <View style={[styles.lockDot, { borderColor: focused ? colors.tabActive : '#CBD2DE' }]}>
          <Feather name="lock" size={8} color={tint} />
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} badge={3} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ focused }) => <TabIcon name="file-text" focused={focused} locked />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
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
  lockDot: {
    position: 'absolute', top: -4, right: -8,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFFFFF', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
});
