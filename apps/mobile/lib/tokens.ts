// apps/mobile/lib/tokens.ts
// Single source of truth for all visual values in apps/mobile.
// Values extracted verbatim from docs/design-handoff/tokens/.
// No screen file may hardcode colors, font sizes, spacing, or radii.

import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

// ── Colors ──────────────────────────────────────────────────────
export const colors = {
  // Surfaces
  ink:        '#0B1220',
  ink2:       '#131B2E',
  paper:      '#FFFFFF',
  canvas:     '#F4F6FA',
  line:       '#E5E8EE',

  // Text
  text:       '#0F172A',
  muted:      '#6B7280',
  subtle:     '#9AA3B2',
  onInk:      '#FFFFFF',
  onInkMuted: 'rgba(255,255,255,0.55)',

  // Brand / Accent
  blue:       '#1A6BFF',
  blueTint:   '#E8F0FF',
  blueLine:   '#D8E4FB',

  // Status
  pending:    '#B5651D',
  pendingTint:'#FFF3E0',

  // Tab bar
  tabActive:   '#1A6BFF',
  tabInactive: '#8A93A4',
  tabBarBg:    '#FFFFFF',
  tabBarBorder:'#E5E8EE',

  // Translucent on dark header
  headerChipBg:     'rgba(255,255,255,0.08)',
  headerChipBorder: 'rgba(255,255,255,0.12)',
  headerHairline:   'rgba(255,255,255,0.06)',
} as const;

export type ColorToken = keyof typeof colors;

// ── Font weights ─────────────────────────────────────────────────
export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

// ── Font sizes (px == dp in RN) ──────────────────────────────────
export const fontSize = {
  badge:    10,  // tab badge / pip text
  caption:  11,  // uppercase eyebrow / section title
  small:    12,  // meta, captions, tab label
  footnote: 13,  // list-row meta, body small
  body:     14,  // primary body text
  bodyLg:   15,  // emphasized body
  callout:  17,  // stat values, section row title
  title3:   19,  // card headline
  title2:   22,  // auth screen headline
  title1:   26,  // header large title
  display:  34,  // reserved — onboarding only
} as const;

// ── Line heights ─────────────────────────────────────────────────
export const lineHeight = {
  tight:   1.15,
  snug:    1.25,
  normal:  1.4,
  relaxed: 1.5,
  loose:   1.55,
} as const;

// ── Letter spacing ───────────────────────────────────────────────
export const letterSpacing = {
  tightest: -0.4,
  tighter:  -0.3,
  tight:    -0.2,
  normal:    0,
  wide:      0.1,
  wider:     0.2,
  widest:    2.4,
} as const;

// ── Role-based text presets ──────────────────────────────────────
export const text = {
  headerLargeTitle: {
    fontSize:      fontSize.title1,
    fontWeight:    fontWeight.bold,
    letterSpacing: letterSpacing.tightest,
    lineHeight:    fontSize.title1 * lineHeight.tight,
  },
  headerSubtitle: {
    fontSize:      fontSize.footnote,
    fontWeight:    fontWeight.regular,
    letterSpacing: letterSpacing.wide,
  },
  headerBrand: {
    fontSize:      fontSize.caption,
    fontWeight:    fontWeight.semibold,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize:      fontSize.title3,
    fontWeight:    fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight:    fontSize.title3 * lineHeight.tight,
  },
  rowTitle: {
    fontSize:   fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.body * lineHeight.snug,
  },
  body: {
    fontSize:   fontSize.bodyLg,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.bodyLg * lineHeight.loose,
  },
  meta: {
    fontSize:   fontSize.small,
    fontWeight: fontWeight.regular,
  },
  sectionEyebrow: {
    fontSize:      fontSize.small,
    fontWeight:    fontWeight.bold,
    letterSpacing: 1.7,
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontSize:      fontSize.callout,
    fontWeight:    fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  statLabel: {
    fontSize:      fontSize.caption,
    fontWeight:    fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  tabLabel: {
    fontSize:      10.5,
    fontWeight:    fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  tabLabelActive: {
    fontSize:      10.5,
    fontWeight:    fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
  chip: {
    fontSize:      fontSize.caption,
    fontWeight:    fontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  ctaPrimary: {
    fontSize:      fontSize.footnote,
    fontWeight:    fontWeight.semibold,
    letterSpacing: 0.1,
  },
} as const satisfies Record<string, TextStyle>;

// ── 4-pt spacing scale ───────────────────────────────────────────
export const space = {
  xs:    4,
  sm:    8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
} as const;

// ── Border radii ─────────────────────────────────────────────────
export const radius = {
  xs:    4,
  sm:    6,
  md:    9,
  lg:   12,
  xl:   16,
  '2xl': 18,
  pill: 999,
} as const;

// ── Shadows (cross-platform) ─────────────────────────────────────
type Shadow = Pick<ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

const emptyShadow: Shadow = {};

export const shadow = {
  sm: Platform.select<Shadow>({
    ios: {
      shadowColor:   colors.text,
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius:  2,
    },
    android: { elevation: 1 } as Shadow,
    default: emptyShadow,
  }),
  cta: Platform.select<Shadow>({
    ios: {
      shadowColor:   colors.blue,
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius:  12,
    },
    android: { elevation: 4 } as Shadow,
    default: emptyShadow,
  }),
  ctaLg: Platform.select<Shadow>({
    ios: {
      shadowColor:   colors.blue,
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius:  16,
    },
    android: { elevation: 6 } as Shadow,
    default: emptyShadow,
  }),
  ink: Platform.select<Shadow>({
    ios: {
      shadowColor:   colors.ink,
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius:  20,
    },
    android: { elevation: 6 } as Shadow,
    default: emptyShadow,
  }),
} as const;

// ── Touch / hit targets ──────────────────────────────────────────
export const minTouch = 44;

// ── Layout constants ─────────────────────────────────────────────
export const layout = {
  screenPaddingX:    space.lg,
  headerPaddingX:    space.xl,
  cardGap:           space.xl,
  rowGap:            space.md,
  headerSafeTop:     47,
  tabBarHeight:      64,
  homeIndicatorSafe: 34,
  avatarSizes: { sm: 36, md: 40, lg: 44, hero: 68 },
} as const;
