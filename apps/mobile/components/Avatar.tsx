import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { colors } from '../lib/theme';

interface AvatarProps {
  name: string | null;
  size?: number;
  // Blue outer ring used on the profile identity card.
  ring?: boolean;
}

export function initialsOf(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  const initials = (first + second).toUpperCase();
  return initials.length > 0 ? initials : '?';
}

// Stable hue per name so an athlete keeps the same placeholder color.
export function hueOf(name: string | null): number {
  let hash = 0;
  for (const char of name ?? '') hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

// Initials on a gradient with a faint diagonal jersey stripe. Real photos
// replace this once profile photos are wired into these screens.
export function Avatar({ name, size = 44, ring = false }: AvatarProps): ReactElement {
  const hue = hueOf(name);
  const avatar = (
    <LinearGradient
      colors={[`hsl(${hue}, 55%, 52%)`, `hsl(${(hue + 18) % 360}, 62%, 40%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }} accessible={false}>
        <Defs>
          <Pattern id="stripe" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect width={8} height={16} fill="rgba(255,255,255,0.06)" />
          </Pattern>
        </Defs>
        <Rect width={size} height={size} fill="url(#stripe)" />
      </Svg>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.36, letterSpacing: 0.5 }}>
        {initialsOf(name)}
      </Text>
    </LinearGradient>
  );

  if (!ring) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {avatar}
      </View>
    );
  }
  // 3px white ring inside a 2px blue ring.
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ padding: 2, borderRadius: size, backgroundColor: colors.blue }}
    >
      <View style={{ padding: 3, borderRadius: size, backgroundColor: '#FFFFFF' }}>{avatar}</View>
    </View>
  );
}
