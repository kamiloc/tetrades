import { TRPCClientError } from '@trpc/client';

// The tRPC error code of a failed call (`UNAUTHORIZED`, `FORBIDDEN`, …), or
// null for anything else (network failure, a non-tRPC error). Apps map codes
// to their own user-facing copy and never show the server message.
export function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof TRPCClientError)) return null;
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || !('code' in data)) return null;
  return typeof data.code === 'string' ? data.code : null;
}
