import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestHeaders, resetNextMocks } from '../test/next-mocks';

vi.mock('next/headers', async () => (await import('../test/next-mocks')).nextHeaders);

import { getServerLocalization } from './server-i18n';

describe('getServerLocalization', () => {
  beforeEach(resetNextMocks);

  it.each([
    ['es-CO,es;q=0.9,en;q=0.8', 'es', 'Tus clubes'],
    ['en-US,en;q=0.9', 'en', 'Your clubs'],
    ['fr-FR,de;q=0.8', 'en', 'Your clubs'],
  ])('uses the request language %s', async (acceptLanguage, locale, copy) => {
    requestHeaders.set('accept-language', acceptLanguage);
    const localization = await getServerLocalization();
    expect(localization.locale).toBe(locale);
    expect(localization.t('trainer.yourClubs')).toBe(copy);
  });

  it('falls back to English without the header', async () => {
    const localization = await getServerLocalization();
    expect(localization.locale).toBe('en');
  });
});
