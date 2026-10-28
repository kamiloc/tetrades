import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { IconName } from '../lib/icons';
import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

// Inline empty row inside a section card.
export function EmptyRow({ icon, children }: { icon: IconName; children: string }): ReactElement {
  return (
    <View className="flex-row items-center gap-2.5 px-4 py-3">
      <View className="h-[34px] w-[34px] items-center justify-center rounded-md border border-dashed border-dash">
        <Feather name={icon} size={16} color={colors.subtle} />
      </View>
      <Text className="text-footnote text-muted">{children}</Text>
    </View>
  );
}
