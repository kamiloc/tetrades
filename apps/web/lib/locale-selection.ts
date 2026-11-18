export type AppLocale = 'en' | 'es';

export function normalizeLanguageTag(languageTag: string | null | undefined): AppLocale | null {
  if (languageTag === null || languageTag === undefined) return null;
  const language = languageTag.trim().replaceAll('_', '-').split('-')[0]?.toLowerCase();
  return language === 'en' || language === 'es' ? language : null;
}

export function resolveAppLocale(languageTags: readonly (string | null | undefined)[]): AppLocale {
  for (const languageTag of languageTags) {
    const locale = normalizeLanguageTag(languageTag);
    if (locale !== null) return locale;
  }
  return 'en';
}

export function resolveAcceptLanguage(acceptLanguage: string | null): AppLocale {
  if (acceptLanguage === null || acceptLanguage.trim() === '') return 'en';

  const preferences: { languageTag: string; quality: number; order: number }[] = [];
  for (const [order, entry] of acceptLanguage.split(',').entries()) {
    const [rawTag, ...parameters] = entry.trim().split(';');
    const languageTag = rawTag?.trim();
    if (languageTag === undefined || languageTag === '' || languageTag === '*') continue;

    let quality = 1;
    for (const parameter of parameters) {
      const [name, value] = parameter.trim().split('=');
      if (name?.trim().toLowerCase() === 'q') {
        const parsed = Number(value);
        quality = Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : 0;
      }
    }
    if (quality > 0) preferences.push({ languageTag, quality, order });
  }

  preferences.sort((left, right) => right.quality - left.quality || left.order - right.order);
  return resolveAppLocale(preferences.map(({ languageTag }) => languageTag));
}
