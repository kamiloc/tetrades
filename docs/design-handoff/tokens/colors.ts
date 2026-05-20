// design_handoff_athlete_passport_tabs/tokens/colors.ts
// Athlete Passport — color tokens
// Lifted exactly from the HTML prototype's --css-variables.

export const colors = {
  // ── Surfaces ────────────────────────────────────────────────
  ink:        '#0B1220', //  dark header background (top of gradient)
  ink2:       '#131B2E', //  dark header background (bottom of gradient)
  paper:      '#FFFFFF', //  cards, modal sheets
  canvas:     '#F4F6FA', //  app background under cards
  line:       '#E5E8EE', //  hairline dividers, card borders

  // ── Text ────────────────────────────────────────────────────
  text:       '#0F172A', //  primary text on light surfaces
  muted:      '#6B7280', //  secondary text, meta, captions
  subtle:     '#9AA3B2', //  tertiary text / placeholder / chevrons
  onInk:      '#FFFFFF', //  primary text on dark header
  onInkMuted: 'rgba(255,255,255,0.55)', //  subtitle on dark header

  // ── Brand / Accent ──────────────────────────────────────────
  blue:       '#1A6BFF', //  primary athletic blue — links, CTAs, verified
  blueTint:   '#E8F0FF', //  blue-50: chip background, soft surfaces
  blueLine:   '#D8E4FB', //  blue-100: blue card borders

  // ── Status ──────────────────────────────────────────────────
  pending:    '#B5651D', //  warm pending text
  pendingTint:'#FFF3E0', //  pending chip background

  // ── Tab bar ─────────────────────────────────────────────────
  tabActive:   '#1A6BFF',
  tabInactive: '#8A93A4',
  tabBarBg:    '#FFFFFF',
  tabBarBorder:'#E5E8EE',

  // ── Translucent on dark header ──────────────────────────────
  headerChipBg:     'rgba(255,255,255,0.08)',
  headerChipBorder: 'rgba(255,255,255,0.12)',
  headerHairline:   'rgba(255,255,255,0.06)',
} as const;

export type ColorToken = keyof typeof colors;
