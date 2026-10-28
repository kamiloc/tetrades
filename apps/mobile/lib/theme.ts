// Typed design tokens for style props NativeWind classes can't express
// (icon colors, SVG fills, gradients, shadows). Values come from lib/tokens.js,
// which tailwind.config.js also reads.
import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

import { colors, radius } from './tokens';

export { colors, radius };

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const minTouch = 44;

// Bottom tab bar height above the bottom safe-area inset (the iOS bar is 98
// including the 34pt home-indicator inset). Used to float UI above the bar.
export const TAB_BAR_HEIGHT_ABOVE_INSET = 64;

type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function makeShadow(
  color: string,
  height: number,
  opacity: number,
  blur: number,
  elevation: number,
): Shadow {
  return (
    Platform.select<Shadow>({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height },
        shadowOpacity: opacity,
        shadowRadius: blur,
      },
      android: { elevation },
      default: {},
    }) ?? {}
  );
}

// iOS shadow* props + Android elevation. Apply as style={shadow.sm}.
export const shadow = {
  sm: makeShadow('#0F172A', 1, 0.04, 2, 1),
  cta: makeShadow('#1A6BFF', 4, 0.25, 12, 4),
  ctaLg: makeShadow('#1A6BFF', 6, 0.28, 16, 6),
  ink: makeShadow('#0B1220', 10, 0.18, 20, 6),
} as const;
