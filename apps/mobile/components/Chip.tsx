import type { ChipTone } from '@packages/shared-logic';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { Feather, type IconName } from '../lib/icons';
import { colors } from '../lib/theme';

const TONES: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.canvas, fg: colors.muted },
  pending: { bg: colors.pendingTint, fg: colors.pending },
  blue: { bg: colors.blueTint, fg: colors.blue },
  danger: { bg: colors.dangerTint, fg: colors.danger },
};

export interface ChipProps {
  label: string;
  tone: ChipTone;
  icon: IconName;
  accessibilityLabel: string;
  small?: boolean;
}

// Tinted pill used by the achievement status chip and the inactive-club chip.
// The neutral tone shows no icon (design handoff).
export function Chip({ label, tone, icon, accessibilityLabel, small = false }: ChipProps): ReactElement {
  const colorsOf = TONES[tone];
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center gap-1 rounded-pill"
      style={{ backgroundColor: colorsOf.bg, paddingHorizontal: small ? 6 : 8, paddingVertical: small ? 2 : 3 }}
    >
      {tone === 'neutral' ? null : <Feather name={icon} size={small ? 9 : 10} color={colorsOf.fg} />}
      <Text className="text-chip uppercase" style={{ color: colorsOf.fg, fontSize: small ? 10 : 11 }}>
        {label}
      </Text>
    </View>
  );
}
