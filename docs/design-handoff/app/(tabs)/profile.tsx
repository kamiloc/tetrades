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
// All data comes from useProfile() (TODO: wire to backend in Sprint 3).
// Show <AuthGate tabLabel="Profile" /> when !session.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';
// import { useSession } from '@/lib/auth';
// import { ScreenHeader, IdentityCard, AboutCard, AchievementsCard, PassportProgressCard, AuthGate } from '@/components';

export default function ProfileScreen() {
  // const { session } = useSession();
  // if (!session) return <AuthGate tabLabel="Profile" />;

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
