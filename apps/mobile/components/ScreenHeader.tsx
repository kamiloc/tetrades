import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

import { ApMark } from './ApMark';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  // Stack screens show a back button in place of the bell.
  onBack?: () => void;
  // Extra bottom padding when a card overlaps the header (Profile).
  overlap?: boolean;
}

// Dark gradient header shared by every signed-in screen. The bell is
// decorative until notifications ship (out of scope), so it is hidden from
// assistive tech and not pressable.
export function ScreenHeader({ title, subtitle, onBack, overlap = false }: ScreenHeaderProps): ReactElement {
  return (
    <LinearGradient
      colors={[colors.ink, colors.ink2]}
      style={{ paddingHorizontal: 20, paddingBottom: overlap ? 36 : 16, borderBottomWidth: 1, borderBottomColor: colors.headerHairline }}
    >
      <SafeAreaView edges={['top']}>
        <View className="mt-1.5 h-8 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={12}
                className="-ml-1 mr-1 h-8 w-8 items-center justify-center"
              >
                <Feather name="chevron-left" size={22} color={colors.onInk} />
              </Pressable>
            ) : null}
            <ApMark />
            <Text className="text-header-brand uppercase text-white/80">The Athlete Passport</Text>
          </View>
          {onBack ? null : (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="h-8 w-8 items-center justify-center rounded-pill border border-header-chip-border bg-header-chip-bg"
            >
              <Feather name="bell" size={16} color={colors.onInk} />
            </View>
          )}
        </View>
        <View className="mt-1.5">
          <Text accessibilityRole="header" className="text-header-title text-on-ink">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-header-subtitle text-on-ink-muted">{subtitle}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
