// apps/mobile/app/(tabs)/documents.tsx
// Documents — LOCKED PLACEHOLDER until Sprint 4.
//
// Visual reference: design/index.html, Documents tab.
// This screen is intentionally empty of real functionality. Render:
//   1. <ScreenHeader title="Documents" subtitle="Verified medical records" />
//   2. Lock hero card — 56px dark rounded square with white lock icon,
//      "SPRINT 4 · COMING SOON" eyebrow (blue), "Verified medical records"
//      title, descriptive paragraph, primary CTA "Notify me when ready".
//   3. Locked preview list — 4 rows at opacity 0.7 with a striped doc
//      placeholder and a lock icon on the right.
//   4. Footer micro-copy explaining the placeholder state.
//
// The CTA should call a notify-me mutation that stores the user's
// intent so we can email them when Sprint 4 ships. No real document
// uploads / signing in this milestone.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';

export default function DocumentsScreen() {
  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Documents" subtitle="Verified medical records" /> */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* <LockHeroCard onNotify={notifyMe} /> */}
        {/* <LockedPreviewList items={previewItems} /> */}
        {/* <FooterNote /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.canvas },
  scroll:  { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space['2xl'] },
});
