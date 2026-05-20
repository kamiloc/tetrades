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

const NETWORK: Array<{ initials: string; name: string; verified: boolean; sport: string; org: string; hue: number }> = [
  { initials: 'SM', name: 'Sofia Martinez', verified: true,  sport: 'Track & Field',  org: 'UCLA Athletics',         hue: 160 },
  { initials: 'JO', name: 'James Okafor',   verified: true,  sport: 'Basketball',     org: 'Duke University',        hue: 220 },
  { initials: 'AR', name: 'Amelia Reed',    verified: true,  sport: 'Volleyball',     org: 'USC Trojans',            hue: 280 },
  { initials: 'DB', name: 'Devon Brooks',   verified: false, sport: 'Football',       org: 'Ohio State',             hue: 30  },
  { initials: 'PS', name: 'Priya Shah',     verified: true,  sport: 'Swimming',       org: 'Stanford Athletics',     hue: 190 },
  { initials: 'LO', name: "Liam O'Connor",  verified: true,  sport: 'Soccer',         org: 'UCLA Bruins',            hue: 350 },
];

export default function ConnectionsScreen() {
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
          <Text style={styles.headerTitle}>Connections</Text>
          <Text style={styles.headerSubtitle}>247 athletes · 3 pending</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>PENDING REQUESTS</Text>
            <Text style={styles.linkText}>Manage</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.pendingRow}>
              <View style={styles.stackedAvatars}>
                <View style={[styles.smallAvatar, styles.avatar1]}>
                  <Text style={styles.smallAvatarText}>K</Text>
                </View>
                <View style={[styles.smallAvatar, styles.avatar2]}>
                  <Text style={styles.smallAvatarText}>Z</Text>
                </View>
                <View style={[styles.smallAvatar, styles.avatar3]}>
                  <Text style={styles.smallAvatarText}>E</Text>
                </View>
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>3 athletes want to connect</Text>
                <Text style={styles.pendingNames}>Kai, Zara, Ethan</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>3</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Network list */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>YOUR NETWORK</Text>
            <Text style={styles.mutedMeta}>247 total</Text>
          </View>
          <View style={styles.card}>
            {NETWORK.map((athlete, index) => (
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
                  <View style={styles.messageBtn}>
                    <Text style={styles.messageBtnText}>Message</Text>
                  </View>
                </View>
                {index < NETWORK.length - 1 ? <View style={styles.rowDivider} /> : null}
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

  // Card base
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },

  // Section
  section: {
    marginBottom: space.xl,
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
  },
  linkText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.blue,
  },
  mutedMeta: {
    ...textTokens.meta,
    color: colors.muted,
  },

  // Pending row
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: space.md,
  },
  stackedAvatars: {
    flexDirection: 'row',
    width: 76,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.paper,
    marginLeft: -10,
  },
  avatar1: { backgroundColor: colors.blue,    marginLeft: 0 },
  avatar2: { backgroundColor: colors.pending  },
  avatar3: { backgroundColor: colors.muted    },
  smallAvatarText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.paper,
  },
  pendingInfo: { flex: 1 },
  pendingTitle: {
    ...textTokens.rowTitle,
    color: colors.text,
  },
  pendingNames: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countBadgeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.paper,
  },

  // Connection rows
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
  messageBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.blueLine,
    backgroundColor: colors.paper,
  },
  messageBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.blue,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: space.md,
  },
});
