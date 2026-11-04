import { MutationObserver } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { describe, expect, it, vi } from 'vitest';

import { createApiQueryClient } from './query-client.js';

function trpcError(code: string) {
  return new TRPCClientError(code, {
    result: { error: { message: code, code: -32001, data: { code, httpStatus: 401 } } },
  });
}

async function failQuery(onUnauthorized: () => void, error: unknown) {
  const client = createApiQueryClient({ onUnauthorized });
  const queryFn = vi.fn(async () => {
    throw error;
  });
  await client.fetchQuery({ queryKey: ['q'], queryFn }).catch(() => undefined);
  return queryFn;
}

async function failMutation(onUnauthorized: (() => void) | undefined, error: unknown) {
  const client = createApiQueryClient({ onUnauthorized });
  const observer = new MutationObserver(client, {
    mutationFn: async () => {
      throw error;
    },
  });
  await observer.mutate().catch(() => undefined);
}

describe('createApiQueryClient onUnauthorized', () => {
  it('is called once for an UNAUTHORIZED query, which is not retried', async () => {
    const onUnauthorized = vi.fn();
    const queryFn = await failQuery(onUnauthorized, trpcError('UNAUTHORIZED'));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('is called once for an UNAUTHORIZED mutation', async () => {
    const onUnauthorized = vi.fn();
    await failMutation(onUnauthorized, trpcError('UNAUTHORIZED'));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('is never called for FORBIDDEN', async () => {
    const onUnauthorized = vi.fn();
    await failMutation(onUnauthorized, trpcError('FORBIDDEN'));
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('is never called for a network error, which is retried once', async () => {
    const onUnauthorized = vi.fn();
    const client = createApiQueryClient({ onUnauthorized });
    const queryFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await client.fetchQuery({ queryKey: ['net'], queryFn, retryDelay: 0 }).catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('works without a handler', async () => {
    await expect(failMutation(undefined, trpcError('UNAUTHORIZED'))).resolves.toBeUndefined();
  });
});
