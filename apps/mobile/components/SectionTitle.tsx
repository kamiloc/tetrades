import type { ReactElement, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface SectionTitleProps {
  children: string;
  // Optional right-side link (e.g. "See all") or meta text.
  action?: { label: string; onPress: () => void };
  meta?: string;
  right?: ReactNode;
}

export function SectionTitle({ children, action, meta, right }: SectionTitleProps): ReactElement {
  return (
    <View className="flex-row items-center justify-between px-1 pb-2">
      <Text accessibilityRole="header" className="text-eyebrow uppercase text-muted">
        {children}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="link"
          hitSlop={12}
          className="min-h-[24px] justify-center"
        >
          <Text className="text-[12.5px] font-semibold text-blue">{action.label}</Text>
        </Pressable>
      ) : null}
      {meta ? <Text className="text-meta text-muted">{meta}</Text> : null}
      {right ?? null}
    </View>
  );
}
