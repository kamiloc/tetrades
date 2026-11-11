import { describe, expect, it } from 'vitest';

import { accessibilityLanguageFor, normalizeLanguageTag, resolveAppLocale } from './locale-selection';

describe('mobile locale selection', () => {
  it.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['es', 'es'],
    ['es-CO', 'es'],
    ['es_MX', 'es'],
  ])('normalizes %s to %s', (tag, expected) => {
    expect(normalizeLanguageTag(tag)).toBe(expected);
  });

  it('uses the first supported device language preference', () => {
    expect(resolveAppLocale(['fr-FR', 'es-CO', 'en-US'])).toBe('es');
  });

  it('falls back to English when no preference is supported', () => {
    expect(resolveAppLocale(['fr-FR', 'de-DE'])).toBe('en');
    expect(resolveAppLocale([])).toBe('en');
  });
});

describe('mobile accessibility language', () => {
  it('uses a matching language and Spanish regional tag', () => {
    expect(accessibilityLanguageFor('en')).toBe('en-US');
    expect(accessibilityLanguageFor('es')).toBe('es-CO');
  });
});
