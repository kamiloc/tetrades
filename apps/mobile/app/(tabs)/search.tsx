import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  fontSize,
  fontWeight,
  layout,
  radius,
  shadow,
  space,
  text as textTokens,
} from '../../lib/tokens';

const SPORTS = [
  'Soccer', 'Basketball', 'Football', 'Track & Field',
  'Volleyball', 'Baseball', 'Tennis', 'Swimming', 'Rowing', 'Lacrosse',
] as const;

const RECENT = [
  { query: 'Stanford soccer',  meta: 'Sport · org'      },
  { query: 'D1 swimmers',      meta: 'Sport · division' },
  { query: 'Sofia Martinez',   meta: 'Athlete'          },
] as const;

const SUGGESTED: Array<{ initials: string; name: string; verified: boolean; sport: string; org: string; hue: number }> = [
  { initials: 'TW', name: 'Tyler Wu',       verified: true,  sport: 'Basketball', org: 'Duke University',    hue: 210 },
  { initials: 'NL', name: 'Nadia Laurent',  verified: true,  sport: 'Swimming',   org: 'Texas Longhorns',    hue: 170 },
  { initials: 'RK', name: 'Ravi Kapoor',    verified: false, sport: 'Soccer',     org: 'Penn State Nittany', hue: 40  },
];

export default function SearchScreen() {
  return (
    <View style={styles.root}>
      {/* Dark header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <View style={styles.apMark} />
              <Text style={styles.brandName}>THE ATHLETE PASSPORT</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find athletes & teams</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search field */}
        <View style={[styles.searchField, shadow.sm]}>
          <Feather name="search" size={18} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search athletes by name or sport"
            placeholderTextColor={colors.subtle}
            editable
            returnKeyType="search"
            accessibilityLabel="Search athletes"
          />
          <View style={styles.kbdHint}>
            <Text style={styles.kbdHintText}>⌘K</Text>
          </View>
        </View>

        {/* Browse by sport */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>BROWSE BY SPORT</Text>
          <View style={styles.sportsGrid}>
            {SPORTS.map((sport) => (
              <View key={sport} style={styles.sportChip}>
                <Text style={styles.sportChipText}>{sport}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent searches */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>RECENT</Text>
            <Text style={styles.clearText}>Clear</Text>
          </View>
          <View style={styles.card}>
            {RECENT.map(({ query, meta }, index) => (
              <View key={query}>
                <View style={styles.recentRow}>
                  <View style={styles.recentTile}>
                    <Feather name="clock" size={15} color={colors.muted} />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentQuery}>{query}</Text>
                    <Text style={styles.recentMeta}>{meta}</Text>
                  </View>
                  <Feather name="search" size={15} color={colors.subtle} />
                </View>
                {index < RECENT.length - 1 ? <View style={styles.rowDivider} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Suggested for you */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>SUGGESTED FOR YOU</Text>
          <View style={styles.card}>
            {SUGGESTED.map((athlete, index) => (
              <View key={athlete.name}>
                <View style={styles.connectionRow}>
                  <View style={[styles.avatar, { backgroundColor: `hsl(${athlete.hue}, 60%, 50%)` }]}>
                    <Text style={styles.avatarInitials}>{athlete.initials}</Text>
                  </View>
                  <View style={styles.athleteInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.athleteName} numberOfLines={1}>{athlete.name}</Text>
                      {athlete.verified ? (
                        <View style={styles.blueCheck}>
                          <Feather name="check" size={9} color={colors.paper} accessibilityLabel="Verified" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.sportText}>{athlete.sport}</Text>
                    <Text style={styles.orgText}>{athlete.org}</Text>
                  </View>
                  <View style={styles.connectBtn}>
                    <Feather name="plus" size={13} color={colors.paper} />
                    <Text style={styles.connectBtnText}>Connect</Text>
                  </View>
                </View>
                {index < SUGGESTED.length - 1 ? <View style={styles.rowDivider} /> : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  // Header
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  brandRow: {
    height: 32,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  apMark: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    backgroundColor: colors.headerChipBg,
    borderWidth: 1,
    borderColor: colors.headerChipBorder,
  },
  brandName: {
    ...textTokens.headerBrand,
    color: colors.onInkMuted,
  },
  headerTitle: {
    ...textTokens.headerLargeTitle,
    color: colors.onInk,
    marginTop: space.md,
  },
  headerSubtitle: {
    ...textTokens.headerSubtitle,
    color: colors.onInkMuted,
    marginTop: 2,
    marginBottom: space.xl,
  },

  // Scroll
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space.lg,
    paddingBottom: space['2xl'],
  },

  // Search field
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.bodyLg - 0.5,
    fontWeight: fontWeight.regular,
    color: colors.text,
  },
  kbdHint: {
    paddingHorizontal: space.sm - 2,
    paddingVertical: 2,
    backgroundColor: colors.canvas,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  kbdHintText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: colors.muted,
  },

  // Section
  section: {
    marginTop: space.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space.sm,
    paddingHorizontal: 4,
  },
  sectionEyebrow: {
    ...textTokens.sectionEyebrow,
    color: colors.muted,
    paddingBottom: space.sm,
    paddingHorizontal: 4,
  },
  clearText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.blue,
    paddingBottom: space.sm,
  },

  // Card base
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },

  // Sport chips
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  sportChip: {
    paddingHorizontal: 14,
    paddingVertical: space.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  sportChipText: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },

  // Recent rows
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.md,
  },
  recentTile: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentQuery: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  recentMeta: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 2,
  },

  // Connection rows (suggested)
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.md,
  },
  avatar: {
    width: layout.avatarSizes.lg,
    height: layout.avatarSizes.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.paper,
  },
  athleteInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  athleteName: {
    ...textTokens.rowTitle,
    color: colors.text,
    flexShrink: 1,
  },
  blueCheck: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportText: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 2,
  },
  orgText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.regular,
    color: colors.subtle,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
  },
  connectBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.paper,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: space.md,
  },
});
