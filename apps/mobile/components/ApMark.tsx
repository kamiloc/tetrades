import type { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../lib/theme';

// The Athlete Passport shield mark.
export function ApMark({ size = 18 }: { size?: number }): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      <Path
        d="M12 2.5 3.5 5.5v5.7c0 5.4 3.6 9.1 8.5 10.3 4.9-1.2 8.5-4.9 8.5-10.3V5.5L12 2.5z"
        stroke={colors.blue}
        strokeWidth={1.8}
        fill="rgba(26,107,255,0.15)"
      />
      <Path
        d="M9.2 16V8.5h3.3c1.7 0 2.9 1 2.9 2.6s-1.2 2.6-2.9 2.6h-1.5V16"
        stroke="#FFFFFF"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
