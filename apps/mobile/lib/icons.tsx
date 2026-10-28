import ExpoFeather from '@expo/vector-icons/Feather';
import type { ReactElement } from 'react';

// The Feather icons this app uses. Keeping the union narrow catches typos
// and documents the icon set from the design handoff.
export type IconName =
  | 'activity'
  | 'alert-circle'
  | 'bell'
  | 'calendar'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'eye'
  | 'file-text'
  | 'flag'
  | 'lock'
  | 'log-out'
  | 'mail'
  | 'map-pin'
  | 'plus'
  | 'refresh-cw'
  | 'search'
  | 'shield'
  | 'trending-down'
  | 'trending-up'
  | 'user'
  | 'user-plus'
  | 'users'
  | 'wifi-off'
  | 'x';

interface FeatherProps {
  name: IconName;
  size: number;
  color: string;
  accessibilityLabel?: string;
}

export function Feather({ name, size, color, accessibilityLabel }: FeatherProps): ReactElement {
  return (
    <ExpoFeather
      name={name}
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityLabel === undefined}
      importantForAccessibility={accessibilityLabel === undefined ? 'no-hide-descendants' : 'auto'}
    />
  );
}
