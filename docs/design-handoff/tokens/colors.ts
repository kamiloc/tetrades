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
  dash:       '#CBD3DF', //  dashed empty-state outlines

  // ── Performance / state surfaces ───────────────────────────
  danger:     '#C23B3B',
  dangerTint: '#FDECEC',
  dangerLine: '#F6D4D4',
  segmented:  '#E9EDF3',

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

  // ── Web portal shell (web/index.html) — web-only, mobile ignores these ──
  ink3:         '#1A2238', //  sidebar elevated row hover
  inkDeep:      '#0A0F1B', //  sidebar gradient end
  inkEdge:      '#050912', //  sidebar right border
  inkLine:      'rgba(255,255,255,0.08)', //  sidebar hairlines
  inkLine2:     'rgba(255,255,255,0.14)', //  sidebar raised borders
  onInk2:       'rgba(255,255,255,0.62)', //  sidebar secondary text
  onInk3:       'rgba(255,255,255,0.42)', //  sidebar section titles
  roleBlue:     '#7FB0FF', //  admin portal role label on ink
  roleAmber:    '#F5C07A', //  trainer portal role label on ink
  paper2:       '#FAFBFD', //  table header, dialog footer, subtle inset
  line2:        '#EEF1F5', //  softer hairlines between table rows
  tag:          '#F1F4F9', //  neutral chip background (mobile already mirrors it)
  blue2:        '#155EE0', //  link / primary hover
  verified:     '#16A34A', //  active / accepted status text
  verifiedTint: '#E7F6EC', //  active / accepted chip background
  rejected:     '#DC2626', //  deactivated / revoked status text, danger button
  rejectedTint: '#FDECEC', //  deactivated / revoked chip background
  scrim:        'rgba(11,18,32,0.42)', //  modal backdrop
} as const;

export type ColorToken = keyof typeof colors;
