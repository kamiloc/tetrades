import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

interface MSegmentedProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Readonly<Record<T, string>>;
  accessibilityLabel: string;
  disabled?: boolean;
}

// Segmented control (range switch, audience picker).
export function MSegmented<T extends string>({
  options,
  value,
  onChange,
  labels,
  accessibilityLabel,
  disabled = false,
}: MSegmentedProps<T>): ReactElement {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className="flex-row gap-0.5 rounded-segmented bg-segmented p-[3px]"
    >
      {options.map((option) => {
        const selected = option === value;
        const label = labels ? labels[option] : option;
        return (
          <Pressable
            key={option}
            onPress={() => {
              if (!selected) onChange(option);
            }}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected, disabled }}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${selected ? 'bg-paper' : ''}`}
          >
            <Text className={`text-cta ${selected ? 'text-text' : 'text-muted'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
