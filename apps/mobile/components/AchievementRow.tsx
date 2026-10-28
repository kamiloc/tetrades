import { achievementChip, type ChipTone, type VerificationStatusValue } from '@packages/shared-logic';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { IconName } from '../lib/icons';
import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

import { StatusChip } from './StatusChip';

const TILE: Record<ChipTone, { bg: string; fg: string; icon: IconName }> = {
  neutral: { bg: colors.canvas, fg: colors.muted, icon: 'shield' },
  pending: { bg: colors.pendingTint, fg: colors.pending, icon: 'clock' },
  blue: { bg: colors.blueTint, fg: colors.blue, icon: 'check' },
  danger: { bg: colors.dangerTint, fg: colors.danger, icon: 'alert-circle' },
};

interface AchievementRowProps {
  title: string;
  meta: string;
  status: VerificationStatusValue;
  last?: boolean;
  onPress?: () => void;
}

export function AchievementRow({ title, meta, status, last = false, onPress }: AchievementRowProps): ReactElement {
  const tile = TILE[achievementChip(status).tone];
  const content = (
    <View className={`flex-row items-center gap-3 px-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View className="h-[34px] w-[34px] items-center justify-center rounded-md" style={{ backgroundColor: tile.bg }}>
        <Feather name={tile.icon} size={17} color={tile.fg} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-row-title text-text" numberOfLines={2}>
          {title}
        </Text>
        <Text className="mt-0.5 text-meta text-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <StatusChip status={status} small />
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${achievementChip(status).accessibilityLabel}`}
      accessibilityHint="Opens certification options"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
