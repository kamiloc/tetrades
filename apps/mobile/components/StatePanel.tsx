import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { IconName } from '../lib/icons';
import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

import { PillButton } from './PillButton';

interface StatePanelProps {
  tone?: 'blue' | 'danger';
  icon: IconName;
  title: string;
  body: string;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}

// Empty / error hero panel. Announced politely to screen readers.
export function StatePanel({ tone = 'blue', icon, title, body, primary, secondary }: StatePanelProps): ReactElement {
  const danger = tone === 'danger';
  return (
    <LinearGradient
      colors={danger ? [colors.paper, colors.paper] : ['#F7FAFF', colors.paper]}
      style={{ padding: 18, borderRadius: 16, borderWidth: 1, borderColor: danger ? colors.dangerLine : colors.blueLine, alignItems: 'center' }}
    >
      <View accessibilityLiveRegion="polite" accessibilityRole="summary" className="items-center">
        <View
          className="mb-3 h-[52px] w-[52px] items-center justify-center rounded-xl"
          style={{ backgroundColor: danger ? colors.dangerTint : colors.blueTint }}
        >
          <Feather name={icon} size={23} color={danger ? colors.danger : colors.blue} />
        </View>
        <Text className="mt-1 text-center text-state-title text-text">{title}</Text>
        <Text className="mt-1.5 max-w-[280px] text-center text-state-body text-muted">{body}</Text>
      </View>
      <View className="mt-4 flex-row flex-wrap justify-center gap-2">
        <PillButton
          label={primary.label}
          onPress={primary.onPress}
          variant={danger ? 'danger' : 'primary'}
          icon={danger ? 'refresh-cw' : undefined}
        />
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            className="min-h-[44px] justify-center rounded-pill px-2"
          >
            <Text className="text-cta text-muted">{secondary.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}
