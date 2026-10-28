import type { ReactElement } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../lib/theme';

// Verified badge next to an athlete's name.
export function BlueCheck({ size = 16 }: { size?: number }): ReactElement {
  return (
    <View
      accessible
      accessibilityLabel="Verified"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <Path d="m5 12 5 5 9-10" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
