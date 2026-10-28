import { achievementChip, type ChipTone, type VerificationStatusValue } from '@packages/shared-logic';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

const TONES: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.canvas, fg: colors.muted },
  pending: { bg: colors.pendingTint, fg: colors.pending },
  blue: { bg: colors.blueTint, fg: colors.blue },
  danger: { bg: colors.dangerTint, fg: colors.danger },
};

// Unverified / Pending / Verified / Rejected pill for an achievement.
export function StatusChip({ status, small = false }: { status: VerificationStatusValue; small?: boolean }): ReactElement {
  const chip = achievementChip(status);
  const tone = TONES[chip.tone];
  return (
    <View
      accessible
      accessibilityLabel={chip.accessibilityLabel}
      className="flex-row items-center gap-1 rounded-pill"
      style={{ backgroundColor: tone.bg, paddingHorizontal: small ? 6 : 8, paddingVertical: small ? 2 : 3 }}
    >
      {chip.tone === 'neutral' ? null : <Feather name={chip.icon} size={small ? 9 : 10} color={tone.fg} />}
      <Text className="text-chip uppercase" style={{ color: tone.fg, fontSize: small ? 10 : 11 }}>
        {chip.label}
      </Text>
    </View>
  );
}
