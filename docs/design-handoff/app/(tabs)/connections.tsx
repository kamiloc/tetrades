// apps/mobile/app/(tabs)/connections.tsx
// Connections — list of connected athletes + pending requests.
//
// Visual reference: design/index.html, Connections tab.
// Sections (top → bottom):
//   1. <ScreenHeader title="Connections" subtitle="247 athletes · 3 pending" />
//   2. Pending Requests card — stacked avatars + count badge + "Manage" link
//   3. Your Network card — list of ConnectionRow (avatar, name, BlueCheck,
//      sport line, org line, [Message] outline button)
//
// Pull pending count from useConnections() — drives the tab-bar badge too.

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';

export default function ConnectionsScreen() {
  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Connections" subtitle="247 athletes · 3 pending" /> */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* <PendingRequestsCard requests={pending} /> */}
        {/* <NetworkList connections={connections} /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.canvas },
  scroll:  { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space.lg },
});
