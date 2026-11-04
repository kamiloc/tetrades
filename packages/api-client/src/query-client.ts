import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { getApiErrorCode } from './errors.js';

export interface QueryClientOptions {
  /** Called when any query or mutation fails with UNAUTHORIZED. */
  onUnauthorized?: () => void;
}

// One QueryClient configuration for every app (design D11). Unauthorized
// calls are not retried: the session can't recover by asking again.
export function createApiQueryClient({ onUnauthorized }: QueryClientOptions = {}): QueryClient {
  const onError = (error: unknown) => {
    if (onUnauthorized !== undefined && getApiErrorCode(error) === 'UNAUTHORIZED') onUnauthorized();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) =>
          getApiErrorCode(error) !== 'UNAUTHORIZED' && failureCount < 1,
      },
    },
  });
}
