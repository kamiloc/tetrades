// design_handoff_athlete_passport_tabs/tokens/index.ts
// Single import surface for design tokens.
//
// Usage:
//   import { colors, space, radius, shadow, text, fontSize, fontWeight } from '@/tokens';

export { colors } from './colors';
export type { ColorToken } from './colors';

export {
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  text,
} from './typography';

export {
  space,
  radius,
  shadow,
  minTouch,
  layout,
} from './spacing';
