import { useSession } from '@packages/auth';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Feather, type IconName } from '../../lib/icons';
import { colors } from '../../lib/theme';

function TabIcon({
  name,
  focused,
  badge,
  locked,
}: {
  name: IconName;
  focused: boolean;
  badge?: number;
  locked?: boolean;
}) {
  const tint = focused ? colors.blue : colors.tabInactive;
  return (
    <View className="w-8 h-6 items-center justify-center">
      <Feather name={name} size={24} color={tint} />
      {badge ? (
        <View
          className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-pill bg-blue items-center justify-center border-paper"
          style={{ borderWidth: 1.5 }}
        >
          <Text className="text-paper text-badge font-bold">{badge}</Text>
        </View>
      ) : null}
      {locked ? (
        <View
          className={`absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-paper items-center justify-center ${focused ? 'border-tab-active' : 'border-line'}`}
          style={{ borderWidth: 1.5 }}
        >
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
      <View className="flex-1 items-center justify-center">
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
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.select({
            ios: 98,
            android: 64,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, android: 8 }),
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.1 },
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
