import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';

import './globals.css';

// Self-hosted at build time by next/font (no runtime request to Google).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'The Athlete Passport',
  description: 'Verifiable athletic records',
};

// The document root stays `es`; each portal layout sets `lang="en"` on its
// own root because portal copy follows the English handoff (design D5).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
