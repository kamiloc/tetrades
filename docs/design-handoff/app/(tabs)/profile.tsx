// apps/mobile/app/(tabs)/profile.tsx
// Profile — landing tab.
//
// Visual reference: design/index.html (Profile tab is the initial state).
// Sections (top → bottom):
//   1. <ScreenHeader title="Profile" subtitle="Your athlete identity" />
//   2. Identity card — Avatar (68) + Name + BlueCheck + sport line + tags
//      + stats row (Height · Weight · Connections divided by hairlines)
//   3. About card — bio paragraph + location + joined date row
//   4. Achievements card — list of rows with VerifiedChip / PendingChip
//   5. Passport completeness card — progress bar + "Finish" button
//
// Data states: call useProfile(); isLoading → ProfileSkeleton, error →
// ProfileError with refetch and Sign out, no profile data → ProfileEmpty,
// otherwise render the loaded profile. Header subtitle is TAB_STATES.profile.sub.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';
// import { useProfile } from '@/lib/hooks';
// import { ScreenHeader, IdentityCard, AboutCard, AchievementsCard, PassportProgressCard,
//   ProfileSkeleton, ProfileError, ProfileEmpty } from '@/components';

export default function ProfileScreen() {
  // const { data, isLoading, error, refetch } = useProfile();
  // if (isLoading) return <ProfileSkeleton />;
  // if (error) return <ProfileError onRetry={refetch} onSignOut={signOut} />;
  // if (!data) return <ProfileEmpty />;

  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Profile" subtitle="Your athlete identity" /> */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card overlaps header by 20px — use marginTop: -20 */}
        {/* <IdentityCard /> */}
        {/* <AboutCard /> */}
        {/* <AchievementsCard /> */}
        {/* <PassportProgressCard /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.canvas },
  scroll:  { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX },
});
