import { getLocales } from 'expo-localization';

import { resolveAppLocale, type AppLocale } from './locale-selection';

export function getDeviceAppLocale(): AppLocale {
  return resolveAppLocale(getLocales().map(({ languageTag }) => languageTag));
}
