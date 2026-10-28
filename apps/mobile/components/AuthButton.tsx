import type { ReactElement } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

// Sign-in provider button. Only the email (Magic Link + OTP) variant exists:
// AGENTS.md allows no other auth method, so the handoff's Apple and Google
// buttons are intentionally not built.
export function AuthButton({ label, onPress, loading = false, disabled = false }: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}): ReactElement {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className="h-[50px] flex-row items-center justify-center rounded-lg bg-blue"
      style={({ pressed }) => [
        Platform.select({
          ios: { shadowColor: colors.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 18 },
          android: { elevation: 6 },
          default: {},
        }),
        { opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      <View className="flex-row items-center gap-2">
        {loading ? <ActivityIndicator color={colors.paper} /> : <Feather name="mail" size={17} color={colors.paper} />}
        <Text className="text-body-lg font-semibold text-paper">{label}</Text>
      </View>
    </Pressable>
  );
}
