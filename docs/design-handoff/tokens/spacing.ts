// design_handoff_athlete_passport_tabs/tokens/spacing.ts
// Athlete Passport — spacing, radius, shadow, and layout constants.

import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

// ── 4-pt spacing scale ─────────────────────────────────────────
export const space = {
  xs:  4,
  sm:  8,
  md: 12,
  lg: 16,   //  default card / screen edge padding
  xl: 20,   //  header padding-x, section gutter
  '2xl': 24,
  '3xl': 32,
} as const;

// ── Border radii ───────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   6,   //  small tags
  md:   9,   //  avatar tile / locked doc icon
  lg:  12,   //  search field
  xl:  16,   //  cards
  '2xl': 18, //  auth gate AP icon
  pill: 999,
} as const;

// ── Shadows (cross-platform: iOS shadow* + Android elevation) ──
// Use as: style={[styles.card, shadow.sm]}
type Shadow = Pick<ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const shadow = {
  // Subtle card lift
  sm: Platform.select<Shadow>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 1 } as Shadow,
    default: {},
  })!,
  // Blue CTA glow
  cta: Platform.select<Shadow>({
    ios: {
      shadowColor: '#1A6BFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: { elevation: 4 } as Shadow,
    default: {},
  })!,
  // Auth gate sign-in CTA
  ctaLg: Platform.select<Shadow>({
    ios: {
      shadowColor: '#1A6BFF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
    },
    android: { elevation: 6 } as Shadow,
    default: {},
  })!,
  // Ink chip (lock hero, auth icon)
  ink: Platform.select<Shadow>({
    ios: {
      shadowColor: '#0B1220',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
    },
    android: { elevation: 6 } as Shadow,
    default: {},
  })!,
} as const;

// ── Touch / hit targets ────────────────────────────────────────
export const minTouch = 44; //  HIG minimum

// ── Layout constants ───────────────────────────────────────────
export const layout = {
  screenPaddingX: space.lg,        //  16
  headerPaddingX: space.xl,        //  20
  cardGap: space.xl,               //  20 between sections
  rowGap: space.md,                //  12 inside cards
  headerSafeTop: 47,               //  iOS notch + status bar approximation
  tabBarHeight: 64,
  homeIndicatorSafe: 34,           //  iPhone bottom safe area
  avatarSizes: { sm: 36, md: 40, lg: 44, hero: 68 },
} as const;
