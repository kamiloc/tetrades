import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

// Compact connectivity banner with a Retry action.
export function OfflineBanner({ message = "You're offline", onRetry }: { message?: string; onRetry: () => void }): ReactElement {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-segmented bg-danger-tint py-1 pl-3 pr-1"
    >
      <Feather name="wifi-off" size={15} color={colors.danger} />
      <Text className="flex-1 text-[12.5px] text-danger">{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        className="min-h-[44px] min-w-[44px] items-center justify-center px-2"
      >
        <Text className="text-[12.5px] font-bold text-danger">Retry</Text>
      </Pressable>
    </View>
  );
}
