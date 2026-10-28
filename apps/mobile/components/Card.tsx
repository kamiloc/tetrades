import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { shadow } from '../lib/theme';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

// White surface with the handoff card radius, hairline border, and soft shadow.
export function Card({ children, className = '', style }: CardProps): ReactElement {
  return (
    <View className={`bg-paper rounded-xl border border-line ${className}`} style={[shadow.sm, style]}>
      {children}
    </View>
  );
}
