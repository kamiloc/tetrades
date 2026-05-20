'use client';

import { ApiProvider } from '@packages/api-client';
import type { ReactNode } from 'react';

import { getToken } from '../lib/get-token';

const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApiProvider apiUrl={apiUrl} getToken={getToken}>
      {children}
    </ApiProvider>
  );
}
