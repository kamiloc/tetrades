import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, type ReactElement } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { Feather } from '../lib/icons';
import { colors } from '../lib/theme';

import { PillButton } from './PillButton';

// Value contract: 'YYYY-MM-DD' (or '' when unset), same as the text fields it
// replaces, so form validation and API inputs are unchanged.
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  // Date rolls impossible days over (2026-02-31 becomes March 3), so check
  // that the parts survived unchanged.
  const valid = date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  return valid ? date : null;
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: boolean;
  disabled?: boolean;
  // Display locale and sheet button labels, for screens not yet in English.
  locale?: string;
  cancelLabel?: string;
  doneLabel?: string;
}

// Native date picker behind a field-styled button. Android shows the system
// dialog; iOS shows an inline calendar in a bottom sheet with Done.
export function DateField({
  value,
  onChange,
  label,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
  error = false,
  disabled = false,
  locale = 'en-US',
  cancelLabel = 'Cancel',
  doneLabel = 'Done',
}: DateFieldProps): ReactElement {
  const [open, setOpen] = useState(false);
  const selected = fromIsoDate(value);
  const [draft, setDraft] = useState<Date>(selected ?? maximumDate ?? new Date());

  const display = selected
    ? selected.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : placeholder;

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date): void => {
    setOpen(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(selected ?? maximumDate ?? new Date());
          setOpen(true);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? display : placeholder}`}
        accessibilityHint="Opens a date picker"
        className={`min-h-[48px] flex-row items-center justify-between rounded-lg border bg-paper px-4 ${error ? 'border-danger' : 'border-line'}`}
      >
        <Text className={selected ? 'text-body text-text' : 'text-body text-muted'}>{display}</Text>
        <Feather name="calendar" size={18} color={colors.subtle} />
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode="date"
          onChange={onAndroidChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable className="flex-1 bg-black/30" onPress={() => setOpen(false)} accessibilityLabel="Close" accessibilityRole="button" />
          <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34 }}>
            <Text className="mb-2 text-center text-row-title text-text">{label}</Text>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              onChange={(_event, date) => {
                if (date) setDraft(date);
              }}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              accentColor={colors.blue}
            />
            <View className="mt-2 flex-row justify-end gap-2">
              <PillButton label={cancelLabel} variant="text" onPress={() => setOpen(false)} />
              <PillButton
                label={doneLabel}
                onPress={() => {
                  onChange(toIsoDate(draft));
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
