import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

export function Tag({ children, tone = 'default' }: { children: string; tone?: 'default' | 'blue' }): ReactElement {
  const blue = tone === 'blue';
  return (
    <View className={`rounded-sm border px-2 py-[3px] ${blue ? 'border-blue-line bg-blue-tint' : 'border-line bg-tag'}`}>
      <Text className={`text-[11px] font-semibold ${blue ? 'text-blue' : 'text-slate-600'}`}>{children}</Text>
    </View>
  );
}
