import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestLocale = vi.hoisted(() => ({ acceptLanguage: null as string | null }));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: () => requestLocale.acceptLanguage }),
}));
vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: 'font-inter' }),
  JetBrains_Mono: () => ({ variable: 'font-mono' }),
}));
vi.mock('../components/providers', () => ({
  Providers: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./globals.css', () => ({}));

import RootLayout from './layout';

describe('root document language metadata', () => {
  beforeEach(() => {
    requestLocale.acceptLanguage = null;
  });

  it.each([
    ['es-CO, en;q=0.8', 'es'],
    ['en-US, es;q=0.8', 'en'],
    ['fr-FR, de;q=0.8', 'en'],
    [null, 'en'],
  ])('sets lang=%s for Accept-Language %s', async (acceptLanguage, expectedLocale) => {
    requestLocale.acceptLanguage = acceptLanguage;
    const layout = await RootLayout({ children: createElement('main', null, 'content') });
    const markup = renderToStaticMarkup(layout);
    expect(markup).toContain(`<html lang="${expectedLocale}"`);
  });
});
