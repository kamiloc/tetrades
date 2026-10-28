import { chartGeometry } from '@packages/shared-logic';
import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from '../lib/theme';

export interface ChartPoint {
  value: number;
  label: string;
}

const HEIGHT = 116;

// Line + area chart for one metric's entries (oldest first). Point math lives
// in chartGeometry (@packages/shared-logic), unit-tested for 0, 1, and many
// points; this component only draws it with react-native-svg.
export function SpeedChart({ points, accessibilityLabel }: { points: readonly ChartPoint[]; accessibilityLabel: string }): ReactElement {
  const [width, setWidth] = useState(0);
  const geometry = chartGeometry(points.map((p) => p.value), width, HEIGHT);
  const single = geometry.points.length === 1 ? geometry.points[0] : undefined;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {[0, 1, 2, 3].map((row) => (
              <Line key={row} x1={0} x2={width} y1={(row * HEIGHT) / 3} y2={(row * HEIGHT) / 3} stroke={colors.line} strokeWidth={1} />
            ))}
            {geometry.line !== '' ? (
              <>
                <Path d={geometry.area} fill={colors.blueTint} opacity={0.55} />
                <Path d={geometry.line} fill="none" stroke={colors.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
            {single ? <Circle cx={single.x} cy={single.y} r={4} fill={colors.blue} /> : null}
          </Svg>
        ) : null}
      </View>
      {first && last ? (
        <View className="mt-1.5 flex-row justify-between">
          <Text className="text-caption text-muted">{first.label}</Text>
          {points.length > 1 ? <Text className="text-caption text-muted">{last.label}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
