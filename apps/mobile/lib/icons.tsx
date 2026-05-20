import type { ReactElement } from 'react';
import { Text } from 'react-native';

export type IconName =
  | 'bell'
  | 'check'
  | 'clock'
  | 'file-text'
  | 'lock'
  | 'map-pin'
  | 'plus'
  | 'search'
  | 'shield'
  | 'user'
  | 'users';

interface FeatherProps {
  name: IconName;
  size: number;
  color: string;
  accessibilityLabel?: string;
}

const ICONS: Record<IconName, string> = {
  bell: '!',
  check: '✓',
  clock: '◷',
  'file-text': '▤',
  lock: '⌕',
  'map-pin': '•',
  plus: '+',
  search: '⌕',
  shield: '◆',
  user: '◯',
  users: '◎',
};

export function Feather({
  name,
  size,
  color,
  accessibilityLabel,
}: FeatherProps): ReactElement {
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      className="font-bold text-center"
      style={{ color, fontSize: size, lineHeight: size }}
    >
      {ICONS[name]}
    </Text>
  );
}
