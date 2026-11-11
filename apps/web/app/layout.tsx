import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';
import { resolveAcceptLanguage } from '../lib/locale-selection';
import { getServerLocalization } from '../lib/server-i18n';

import './globals.css';

// Self-hosted at build time by next/font (no runtime request to Google).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerLocalization();
  return { title: t('common.appTitle'), description: t('common.appDescription') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = resolveAcceptLanguage((await headers()).get('accept-language'));
  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable}`}>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
