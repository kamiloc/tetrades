import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useMobileLocalization } from '../lib/i18n';
import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

// Compact connectivity banner with a Retry action.
export function OfflineBanner({ message, onRetry }: { message?: string; onRetry: () => void }): ReactElement {
  const { t } = useMobileLocalization();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-segmented bg-danger-tint py-1 pl-3 pr-1"
    >
      <Feather name="wifi-off" size={15} color={colors.danger} />
      <Text className="flex-1 text-[12.5px] text-danger">{message ?? t('common.offline')}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        className="min-h-[44px] min-w-[44px] items-center justify-center px-2"
      >
        <Text className="text-[12.5px] font-bold text-danger">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
