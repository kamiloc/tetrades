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

const PREVIEW_DOCS = [
  'Annual Physical Examination',
  'ECG · Cardiac Screening',
  'Concussion Baseline (ImPACT)',
  'Orthopedic Clearance',
] as const;

export default function DocumentsScreen() {
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
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSubtitle}>Verified medical records</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock hero card */}
        <View style={[styles.card, styles.heroCard]}>
          <View style={[styles.lockIcon, shadow.ink]}>
            <Feather name="lock" size={26} color={colors.paper} accessibilityLabel="Locked" />
          </View>
          <Text style={styles.heroEyebrow}>SPRINT 4 · COMING SOON</Text>
          <Text style={styles.heroTitle}>Verified medical records</Text>
          <Text style={styles.heroBody}>
            Securely upload physicals, ECGs, and clearance forms. Cryptographically signed by your team's medical staff.
          </Text>
          <View style={[styles.notifyBtn, shadow.cta]}>
            <Text style={styles.notifyBtnText}>Notify me when ready</Text>
          </View>
        </View>

        {/* Locked preview list */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>PREVIEW · LOCKED</Text>
          <View style={[styles.card, styles.previewCard]}>
            {PREVIEW_DOCS.map((doc, index) => (
              <View key={doc}>
                <View style={styles.previewRow}>
                  <View style={styles.docTile}>
                    <Feather name="lock" size={14} color={colors.subtle} />
                  </View>
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle} numberOfLines={1}>{doc}</Text>
                    <Text style={styles.previewMeta}>Locked until Sprint 4</Text>
                  </View>
                  <Feather name="lock" size={16} color={colors.subtle} />
                </View>
                {index < PREVIEW_DOCS.length - 1 ? <View style={styles.rowDivider} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Document uploads, signing, and sharing will arrive in Sprint 4. Today this tab is a placeholder.
        </Text>
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
    paddingTop: space['2xl'],
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

  // Hero card
  heroCard: {
    borderColor: colors.blueLine,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    ...textTokens.sectionEyebrow,
    color: colors.blue,
    marginTop: 14,
  },
  heroTitle: {
    ...textTokens.cardTitle,
    color: colors.text,
    marginTop: space.sm,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.regular,
    color: colors.muted,
    lineHeight: fontSize.footnote * 1.5,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 280,
  },
  notifyBtn: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
  },
  notifyBtnText: {
    ...textTokens.ctaPrimary,
    color: colors.paper,
  },

  // Section
  section: {
    marginTop: space.xl,
  },
  sectionEyebrow: {
    ...textTokens.sectionEyebrow,
    color: colors.muted,
    paddingBottom: space.sm,
    paddingHorizontal: 4,
  },

  // Preview (locked) list
  previewCard: {
    opacity: 0.7,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.md,
  },
  docTile: {
    width: 38,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    ...textTokens.rowTitle,
    color: colors.text,
  },
  previewMeta: {
    ...textTokens.meta,
    color: colors.muted,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: space.md,
  },

  // Footer
  footerNote: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: colors.subtle,
    lineHeight: fontSize.caption * 1.5,
    marginTop: space.md,
    paddingHorizontal: space.sm,
  },
});
