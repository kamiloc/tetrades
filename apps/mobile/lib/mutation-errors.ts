import { TRPCClientError } from '@trpc/client';

export type ErrorCopy = Partial<Record<'BAD_REQUEST' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT', string>> & {
  fallback: string;
};

function errorCode(error: unknown): string | null {
  if (!(error instanceof TRPCClientError)) return null;
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || !('code' in data)) return null;
  const { code } = data as { code: unknown };
  return typeof code === 'string' ? code : null;
}

// Maps a failed mutation to fixed, screen-specific copy by tRPC error code.
// Server messages are never shown raw (design D8).
export function mutationErrorMessage(error: unknown, copy: ErrorCopy): string {
  const code = errorCode(error);
  if (code === 'BAD_REQUEST' && copy.BAD_REQUEST) return copy.BAD_REQUEST;
  if (code === 'FORBIDDEN' && copy.FORBIDDEN) return copy.FORBIDDEN;
  if (code === 'NOT_FOUND' && copy.NOT_FOUND) return copy.NOT_FOUND;
  if (code === 'CONFLICT' && copy.CONFLICT) return copy.CONFLICT;
  return copy.fallback;
}
