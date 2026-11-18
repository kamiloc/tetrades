import { describe, expect, it } from 'vitest';

import { normalizeLanguageTag, resolveAcceptLanguage, resolveAppLocale } from './locale-selection';

describe('web locale selection', () => {
  it.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['es', 'es'],
    ['es-CO', 'es'],
    ['es_MX', 'es'],
  ])('normalizes %s to %s', (tag, expected) => {
    expect(normalizeLanguageTag(tag)).toBe(expected);
  });

  it('uses the first supported language and falls back to English', () => {
    expect(resolveAppLocale(['fr-FR', 'es-CO', 'en-US'])).toBe('es');
    expect(resolveAppLocale(['fr-FR'])).toBe('en');
    expect(resolveAppLocale([])).toBe('en');
  });
});


describe('web Accept-Language negotiation', () => {
  it('uses quality order and supported regional languages', () => {
    expect(resolveAcceptLanguage('fr-FR;q=1, es-CO;q=0.9, en-US;q=0.8')).toBe('es');
    expect(resolveAcceptLanguage('en-US;q=0.4, es-MX;q=0.8')).toBe('es');
  });

  it('uses English when no supported preference is present', () => {
    expect(resolveAcceptLanguage('fr-FR, de-DE;q=0.7')).toBe('en');
    expect(resolveAcceptLanguage(null)).toBe('en');
    expect(resolveAcceptLanguage('')).toBe('en');
  });

  it('ignores zero-quality entries', () => {
    expect(resolveAcceptLanguage('es;q=0, en-US;q=0.5')).toBe('en');
  });
});
