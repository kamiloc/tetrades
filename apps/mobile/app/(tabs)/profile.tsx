import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      {/* Fixed dark header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <View style={styles.apMark} />
              <Text style={styles.brandName}>THE ATHLETE PASSPORT</Text>
            </View>
            <View style={styles.notifBtn}>
              <Feather name="bell" size={16} color={colors.onInk} accessibilityLabel="Notifications" />
            </View>
          </View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Your athlete identity</Text>
        </SafeAreaView>
      </View>

      {/* Scrollable body — identity card overlaps header by 20 px */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View style={[styles.card, styles.identityCard]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>MC</Text>
            </View>
            <View style={styles.avatarInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.athleteName}>Marcus Chen</Text>
                <View style={styles.blueCheck}>
                  <Feather name="check" size={9} color={colors.paper} accessibilityLabel="Verified" />
                </View>
              </View>
              <Text style={styles.sportLine}>Midfielder · Soccer</Text>
              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Stanford Cardinal</Text>
                </View>
                <View style={[styles.tag, styles.tagBlue]}>
                  <Text style={[styles.tagText, styles.tagTextBlue]}>NCAA D1</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>6'1"</Text>
              <Text style={styles.statLabelText}>HEIGHT</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>178 lb</Text>
              <Text style={styles.statLabelText}>WEIGHT</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={[styles.statValue, styles.statValueBlue]}>247</Text>
              <Text style={styles.statLabelText}>CONNECTIONS</Text>
            </View>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>ABOUT</Text>
          <View style={styles.card}>
            <Text style={styles.bioText}>
              Center mid at Stanford. PAC-12 All-Conference 2024. Two-footed playmaker focused on tempo control and final-third creation. Records verified through Athlete Passport since 2023.
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={colors.muted} />
                <Text style={styles.metaText}>Palo Alto, CA</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={13} color={colors.muted} />
                <Text style={styles.metaText}>Joined Aug 2023</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>ACHIEVEMENTS</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>
          <View style={styles.card}>
            <AchievementRow
              icon="check"
              iconColor={colors.blue}
              tileBg={colors.blueTint}
              title="PAC-12 All-Conference"
              meta="2024 · Stanford Athletics"
              status="verified"
              showDivider
            />
            <AchievementRow
              icon="check"
              iconColor={colors.blue}
              tileBg={colors.blueTint}
              title="U.S. Youth National Team — Player Pool"
              meta="2023 · U.S. Soccer"
              status="verified"
              showDivider
            />
            <AchievementRow
              icon="clock"
              iconColor={colors.pending}
              tileBg={colors.pendingTint}
              title="Combine: 40-yd dash · 4.61s"
              meta="2025 · Bay Area Showcase"
              status="pending"
              showDivider
            />
            <AchievementRow
              icon="check"
              iconColor={colors.blue}
              tileBg={colors.blueTint}
              title="Annual Physical — Cleared"
              meta="Mar 2025 · Stanford Sports Med"
              status="verified"
              showDivider={false}
            />
          </View>
        </View>

        {/* Passport completeness */}
        <View style={styles.section}>
          <View style={[styles.card, styles.passportCard]}>
            <View style={styles.passportRow}>
              <View style={styles.passportTile}>
                <Feather name="shield" size={20} color={colors.blue} />
              </View>
              <View style={styles.passportInfo}>
                <Text style={styles.passportTitle}>Passport 82% complete</Text>
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill} />
                </View>
              </View>
              <View style={styles.finishBtn}>
                <Text style={styles.finishBtnText}>Finish</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Inline sub-component (no state, no hooks) ─────────────────────
function AchievementRow({
  icon,
  iconColor,
  tileBg,
  title,
  meta,
  status,
  showDivider,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  tileBg: string;
  title: string;
  meta: string;
  status: 'verified' | 'pending';
  showDivider: boolean;
}) {
  const isVerified = status === 'verified';
  return (
    <>
      <View style={styles.achieveRow}>
        <View style={[styles.achieveTile, { backgroundColor: tileBg }]}>
          <Feather name={icon} size={17} color={iconColor} accessibilityLabel={isVerified ? 'Verified' : 'Pending'} />
        </View>
        <View style={styles.achieveInfo}>
          <Text style={styles.achieveTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.achieveMeta}>{meta}</Text>
        </View>
        {isVerified ? (
          <View style={styles.chipVerified}>
            <Text style={styles.chipVerifiedText}>VERIFIED</Text>
          </View>
        ) : (
          <View style={styles.chipPending}>
            <Text style={styles.chipPendingText}>PENDING</Text>
          </View>
        )}
      </View>
      {showDivider ? <View style={styles.achieveDivider} /> : null}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
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
    justifyContent: 'space-between',
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
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.headerChipBg,
    borderWidth: 1,
    borderColor: colors.headerChipBorder,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: space['2xl'],
  },

  // Card base
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },

  // Identity card
  identityCard: {
    marginTop: -20,
    paddingTop: space.xl,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: layout.avatarSizes.hero,
    height: layout.avatarSizes.hero,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.paper,
  },
  avatarInitials: {
    fontSize: fontSize.title3,
    fontWeight: fontWeight.bold,
    color: colors.paper,
  },
  avatarInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  athleteName: {
    ...textTokens.cardTitle,
    color: colors.text,
  },
  blueCheck: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportLine: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tagText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  tagBlue: {
    backgroundColor: colors.blueTint,
    borderColor: colors.blueLine,
  },
  tagTextBlue: {
    color: colors.blue,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: 18,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingTop: space.md,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    paddingLeft: 14,
  },
  statValue: {
    ...textTokens.statValue,
    color: colors.text,
  },
  statValueBlue: {
    color: colors.blue,
  },
  statLabelText: {
    ...textTokens.statLabel,
    color: colors.muted,
    marginTop: 2,
  },

  // Sections
  section: {
    marginTop: space.xl,
  },
  sectionEyebrow: {
    ...textTokens.sectionEyebrow,
    color: colors.muted,
    paddingBottom: space.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space.sm,
    paddingHorizontal: 4,
  },
  seeAll: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.blue,
  },

  // About card
  bioText: {
    ...textTokens.body,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  metaText: {
    ...textTokens.meta,
    color: colors.muted,
  },

  // Achievement rows
  achieveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.md,
  },
  achieveTile: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveInfo: {
    flex: 1,
  },
  achieveTitle: {
    ...textTokens.rowTitle,
    color: colors.text,
  },
  achieveMeta: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 2,
  },
  achieveDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: space.md,
  },
  chipVerified: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blueLine,
  },
  chipVerifiedText: {
    ...textTokens.chip,
    color: colors.blue,
  },
  chipPending: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    backgroundColor: colors.pendingTint,
    borderRadius: radius.pill,
  },
  chipPendingText: {
    ...textTokens.chip,
    color: colors.pending,
  },

  // Passport card
  passportCard: {
    borderColor: colors.blueLine,
  },
  passportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 14,
    gap: space.md,
  },
  passportTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportInfo: {
    flex: 1,
  },
  passportTitle: {
    ...textTokens.rowTitle,
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.blueLine,
    borderRadius: radius.pill,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  progressFill: {
    width: '82%',
    height: 6,
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
  },
  finishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  finishBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
