import { Feather } from '@expo/vector-icons';
import { useSession } from '@packages/auth';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';


import { colors, fontSize, fontWeight, layout, radius, space, text as textTokens } from '../../lib/tokens';

function TabIcon({
  name,
  focused,
  badge,
  locked,
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
        <View style={focused ? styles.lockDotFocused : styles.lockDotUnfocused}>
          <Feather name="lock" size={8} color={tint} />
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
          height: Platform.select({
            ios: layout.tabBarHeight + layout.homeIndicatorSafe,
            android: layout.tabBarHeight,
          }),
          paddingTop: space.sm,
          paddingBottom: Platform.select({ ios: space.xl, android: space.sm }),
        },
        tabBarLabelStyle: textTokens.tabLabel,
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 32, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.paper,
  },
  badgeText: {
    color: colors.paper,
    fontSize: fontSize.badge,
    fontWeight: fontWeight.bold,
  },
  lockDotFocused: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.tabActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDotUnfocused: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
