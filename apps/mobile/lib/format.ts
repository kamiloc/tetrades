import { accessibilityLanguageFor, type AppLocale } from './locale-selection';

// Locale-aware display formatting. Only what the screen shows changes; stored
// values, form inputs, and API payloads keep their own formats.

export type DateStyle = 'long' | 'medium' | 'monthYear' | 'shortMonthYear';

const DATE_OPTIONS: Readonly<Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  monthYear: { year: 'numeric', month: 'short' },
  shortMonthYear: { year: '2-digit', month: 'short' },
};

export function formatDate(locale: AppLocale, date: Date, style: DateStyle): string {
  return date.toLocaleDateString(accessibilityLanguageFor(locale), DATE_OPTIONS[style]);
}

// At most two decimals, no trailing zeros, locale separators.
export function formatNumber(locale: AppLocale, value: number): string {
  return new Intl.NumberFormat(accessibilityLanguageFor(locale), { maximumFractionDigits: 2 }).format(value);
}

// "4.61 seconds", "82%". The unit comes from the metric catalog as-is.
export function formatMetric(locale: AppLocale, value: number, unit: string): string {
  const number = formatNumber(locale, value);
  const trimmedUnit = unit.trim();
  if (trimmedUnit === '') return number;
  return trimmedUnit === '%' ? `${number}%` : `${number} ${trimmedUnit}`;
}
