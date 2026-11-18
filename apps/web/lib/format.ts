import type { AppLocale } from './locale-selection';

// Locale-aware display formatting for the selected interface language. Only
// what the page shows changes; stored values and API payloads keep their own
// formats.

const LOCALE_TAGS: Readonly<Record<AppLocale, string>> = { en: 'en-US', es: 'es-CO' };

export function localeTag(locale: AppLocale): string {
  return LOCALE_TAGS[locale];
}

export function formatDate(locale: AppLocale, value: Date): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium' }).format(value);
}

export function formatDateTime(locale: AppLocale, value: Date): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export function formatNumber(locale: AppLocale, value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], { maximumFractionDigits }).format(value);
}
