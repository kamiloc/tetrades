import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { IconName } from '../lib/icons';
import { Feather } from '../lib/icons';
import { colors, shadow } from '../lib/theme';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'text';

const VARIANTS: Record<Variant, { container: string; text: string; icon: string }> = {
  primary: { container: 'bg-blue', text: 'text-paper', icon: colors.paper },
  ghost: { container: 'bg-paper border border-line', text: 'text-text', icon: colors.text },
  outline: { container: 'bg-paper border border-blue-line', text: 'text-blue', icon: colors.blue },
  danger: { container: 'bg-paper border border-danger-line', text: 'text-danger', icon: colors.danger },
  text: { container: 'bg-transparent', text: 'text-muted', icon: colors.muted },
};

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  fullWidth?: boolean;
}

// Rounded action button. Always at least 44pt tall (minTouch).
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  accessibilityHint,
  fullWidth = false,
}: PillButtonProps): ReactElement {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`min-h-[44px] flex-row items-center justify-center rounded-pill px-4 ${v.container} ${fullWidth ? 'self-stretch' : ''}`}
      style={({ pressed }) => [variant === 'primary' && !inactive ? shadow.cta : null, { opacity: inactive ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      <View className="flex-row items-center gap-1.5">
        {loading ? <ActivityIndicator size="small" color={v.icon} /> : null}
        {!loading && icon ? <Feather name={icon} size={14} color={v.icon} /> : null}
        <Text className={`text-cta ${v.text}`}>{label}</Text>
      </View>
    </Pressable>
  );
}
