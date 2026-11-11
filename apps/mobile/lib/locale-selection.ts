export type AppLocale = 'en' | 'es';

export function accessibilityLanguageFor(locale: AppLocale): 'en-US' | 'es-CO' {
  return locale === 'es' ? 'es-CO' : 'en-US';
}

export function normalizeLanguageTag(languageTag: string | null | undefined): AppLocale | null {
  if (languageTag === null || languageTag === undefined) return null;

  const language = languageTag.trim().replaceAll('_', '-').split('-')[0]?.toLowerCase();
  if (language === 'en' || language === 'es') return language;
  return null;
}

export function resolveAppLocale(languageTags: readonly (string | null | undefined)[]): AppLocale {
  for (const languageTag of languageTags) {
    const locale = normalizeLanguageTag(languageTag);
    if (locale !== null) return locale;
  }

  return 'en';
}
