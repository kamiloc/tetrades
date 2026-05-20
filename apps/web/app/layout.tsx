import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'The Athlete Passport',
  description: 'Verifiable athletic records',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
