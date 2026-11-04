'use client';

import { ApiProvider } from '@packages/api-client';
import type { ReactNode } from 'react';

// Browser API calls go to the same-origin proxy (/api/trpc), which adds the
// session token on the server (design D3). The browser never holds a token,
// so getToken always returns null.
const noToken = async (): Promise<string | null> => null;

// An expired session that can't be refreshed: go to sign-in and come back
// here. A full navigation lets middleware run again and clears client caches.
function toSignIn(): void {
  const here = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(here)}`);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApiProvider apiUrl="/api/trpc" getToken={noToken} onUnauthorized={toSignIn}>
      {children}
    </ApiProvider>
  );
}
