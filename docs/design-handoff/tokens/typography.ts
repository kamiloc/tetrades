// design_handoff_athlete_passport_tabs/tokens/typography.ts
// Athlete Passport — type scale + role presets
// All values pulled from the HTML prototype.
// fontFamily is left undefined so React Native falls back to the platform
// system font (SF Pro on iOS, Roboto on Android). No custom fonts required.

import type { TextStyle } from 'react-native';

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

// ── Raw scale (px == dp in RN) ─────────────────────────────────
export const fontSize = {
  caption:    11,  //  uppercase eyebrow / section title
  small:      12,  //  meta, captions, tab label
  footnote:   13,  //  list-row meta, body small
  body:       14,  //  primary body text
  bodyLg:     15,  //  emphasized body
  callout:    17,  //  stat values, section row title
  title3:     19,  //  card headline (name on profile)
  title2:     22,  //  auth screen headline
  title1:     26,  //  header large title
  display:    34,  //  reserved — onboarding only
} as const;

export const lineHeight = {
  tight:  1.15,
  snug:   1.25,
  normal: 1.4,
  relaxed:1.5,
  loose:  1.55,
} as const;

export const letterSpacing = {
  tightest: -0.4,  //  large titles
  tighter:  -0.3,
  tight:    -0.2,
  normal:    0,
  wide:      0.1,
  wider:     0.2,
  widest:    2.4,  //  uppercase eyebrows  (≈ 0.14em @ 17px)
} as const;

// ── Role-based text presets (drop-in for <Text style={text.xxx} />) ──
export const text = {
  headerLargeTitle: {
    fontSize: fontSize.title1,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tightest,
    lineHeight: fontSize.title1 * lineHeight.tight,
  },
  headerSubtitle: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.wide,
  },
  headerBrand: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 2.4, // ≈ 0.22em uppercase
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: fontSize.title3,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize.title3 * lineHeight.tight,
  },
  rowTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.body * lineHeight.snug,
  },
  body: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.bodyLg * lineHeight.loose,
  },
  meta: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.regular,
  },
  sectionEyebrow: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.7, //  ≈ 0.14em
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: fontSize.callout,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  statLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  tabLabelActive: {
    fontSize: 10.5,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
  chip: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  ctaPrimary: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.1,
  },
} as const satisfies Record<string, TextStyle>;
