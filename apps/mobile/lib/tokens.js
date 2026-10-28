// Design tokens from docs/design-handoff/tokens/. This is the single source
// for colors, radii, and text presets: tailwind.config.js requires this file
// and lib/theme.ts re-exports it with types. Plain CommonJS so Metro, Babel,
// and the Tailwind CLI can all load it.

const colors = {
  // Surfaces
  ink: '#0B1220',
  ink2: '#131B2E',
  paper: '#FFFFFF',
  canvas: '#F4F6FA',
  line: '#E5E8EE',

  // Text
  text: '#0F172A',
  muted: '#6B7280',
  subtle: '#9AA3B2',
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255,255,255,0.55)',

  // Brand / accent
  blue: '#1A6BFF',
  blueTint: '#E8F0FF',
  blueLine: '#D8E4FB',
  dash: '#CBD3DF',

  // State surfaces
  danger: '#C23B3B',
  dangerTint: '#FDECEC',
  dangerLine: '#F6D4D4',
  segmented: '#E9EDF3',
  tag: '#F1F4F9',

  // Status
  pending: '#B5651D',
  pendingTint: '#FFF3E0',

  // Tab bar
  tabActive: '#1A6BFF',
  tabInactive: '#8A93A4',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E8EE',

  // Translucent on dark header
  headerChipBg: 'rgba(255,255,255,0.08)',
  headerChipBorder: 'rgba(255,255,255,0.12)',
  headerHairline: 'rgba(255,255,255,0.06)',
};

const radius = {
  xs: 4,
  sm: 6,
  md: 9,
  lg: 12,
  segmented: 10,
  xl: 16,
  '2xl': 18,
  pill: 999,
};

// Role-based text presets: [fontSize, lineHeight | undefined, letterSpacing, fontWeight].
const textPresets = {
  'header-title': [26, 30, -0.4, '700'],
  'header-subtitle': [13, undefined, 0.1, '400'],
  'header-brand': [11, undefined, 2.4, '600'],
  'card-title': [19, 22, -0.2, '700'],
  'row-title': [14, 17.5, 0, '600'],
  'body-copy': [15, 23, 0, '400'],
  'state-title': [18, 23, -0.2, '700'],
  'state-body': [13.5, 19, 0, '400'],
  meta: [12, undefined, 0, '400'],
  eyebrow: [12, undefined, 1.7, '700'],
  'stat-value': [17, undefined, -0.2, '700'],
  'stat-label': [11, undefined, 0.2, '600'],
  'tab-label': [10.5, undefined, 0.1, '500'],
  chip: [11, undefined, 0.2, '600'],
  cta: [13, undefined, 0.1, '600'],
};

module.exports = { colors, radius, textPresets };
