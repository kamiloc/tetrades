import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, type ReactNode } from 'react';
import superjson from 'superjson';

import { trpc } from './client.js';

interface ApiProviderProps {
  children: ReactNode;
  apiUrl: string;
  getToken: () => Promise<string | null>;
}

export function ApiProvider({ children, apiUrl, getToken }: ApiProviderProps): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

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
