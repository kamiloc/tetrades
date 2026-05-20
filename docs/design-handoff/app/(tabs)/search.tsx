// apps/mobile/app/(tabs)/search.tsx
// Search — discover athletes by name or sport.
//
// Visual reference: design/index.html, Search tab.
// Sections (top → bottom):
//   1. <ScreenHeader title="Discover" subtitle="Find athletes & teams" />
//   2. Search field — rounded card, magnifier icon left, placeholder
//      "Search athletes by name or sport", ⌘K hint right.
//      onFocus → navigate to a dedicated search results route.
//   3. Browse by sport — 10 pill chips (wrap).
//   4. Recent searches card — 3 rows with clock icon left.
//   5. Suggested for you card — 3 athlete rows with [+ Connect] button.
//
// The search input itself is a TextInput; debounce 200ms before firing
// useSearchAthletes(query).

import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, layout, space } from '@/tokens';

export default function SearchScreen() {
  return (
    <View style={styles.root}>
      {/* <ScreenHeader title="Discover" subtitle="Find athletes & teams" /> */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* <SearchField value={q} onChange={setQ} /> */}
        {/* <SportChips sports={SPORTS} onPress={onSport} /> */}
        {/* <RecentSearches items={recent} /> */}
        {/* <SuggestedAthletes athletes={suggested} /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.canvas },
  scroll:  { flex: 1 },
  content: { paddingBottom: space['2xl'], paddingHorizontal: layout.screenPaddingX, paddingTop: space.lg },
});
