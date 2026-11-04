import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, type ReactNode } from 'react';
import superjson from 'superjson';

import { trpc } from './client.js';
import { createApiQueryClient } from './query-client.js';

interface ApiProviderProps {
  children: ReactNode;
  apiUrl: string;
  getToken: () => Promise<string | null>;
  /** Optional: called once per query or mutation that fails with UNAUTHORIZED. */
  onUnauthorized?: () => void;
}

export function ApiProvider({ children, apiUrl, getToken, onUnauthorized }: ApiProviderProps) {
  const [queryClient] = useState(() => createApiQueryClient({ onUnauthorized }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl,
          transformer: superjson,
          headers: async () => {
            const token = await getToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
