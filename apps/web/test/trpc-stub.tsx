import { ApiProvider } from '@packages/api-client';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

// A fetch-level stand-in for the tRPC API, for component tests. Each
// procedure in a batch is answered by `replies[name](input)`; every call is
// recorded with its input. Unknown procedures answer NOT_FOUND.

export interface StubCall {
  procedure: string;
  input: unknown;
}

export type Reply = { result: { data: unknown } } | ReturnType<typeof trpcError>;

export function trpcError(code: string, httpStatus: number) {
  return { error: { json: { message: 'error', code: -32600, data: { code, httpStatus } } } };
}

/** A superjson payload; `dates` lists the dotted paths that hold Dates. */
export function sj(json: unknown, dates: string[] = []): unknown {
  return dates.length === 0
    ? { json }
    : { json, meta: { values: Object.fromEntries(dates.map((path) => [path, ['Date']])) } };
}

export const ok =
  (data: unknown) =>
  (): Reply => ({ result: { data } });

function inputsOf(url: URL, body: string | null, count: number): unknown[] {
  const raw = body ?? url.searchParams.get('input');
  if (raw === null) return Array.from({ length: count }, () => undefined);
  const parsed = JSON.parse(raw) as Record<string, { json?: unknown } | undefined>;
  return Array.from({ length: count }, (_, i) => parsed[String(i)]?.json);
}

export function stubApi(replies: Record<string, (input: unknown) => Reply>): StubCall[] {
  const calls: StubCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const procedures = decodeURIComponent(url.pathname.split('/api/trpc/')[1] ?? '').split(',');
      const body = typeof init.body === 'string' ? init.body : null;
      const inputs = inputsOf(url, body, procedures.length);
      const answers = procedures.map((procedure, i) => {
        calls.push({ procedure, input: inputs[i] });
        const reply = replies[procedure];
        return reply ? reply(inputs[i]) : trpcError('NOT_FOUND', 404);
      });
      const failed = answers.some((entry) => 'error' in entry);
      return Response.json(answers, { status: failed ? 400 : 200 });
    }),
  );
  return calls;
}

export function renderWithApi(node: ReactNode) {
  return render(
    <ApiProvider apiUrl="http://localhost/api/trpc" getToken={async () => null}>
      {node}
    </ApiProvider>,
  );
}
