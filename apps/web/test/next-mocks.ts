// In-memory stand-ins for next/headers and next/navigation, for testing
// server actions and route handlers outside a Next request.

export interface StoredCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export const cookieJar = new Map<string, StoredCookie>();
export const requestHeaders = new Headers();

export const cookieStore = {
  getAll: () => [...cookieJar.values()].map(({ name, value }) => ({ name, value })),
  get: (name: string) => cookieJar.get(name),
  set: (name: string, value: string, options?: Record<string, unknown>) => {
    cookieJar.set(name, { name, value, options });
  },
};

export class RedirectSignal extends Error {
  constructor(public readonly location: string) {
    super(`NEXT_REDIRECT ${location}`);
  }
}

export function resetNextMocks(): void {
  cookieJar.clear();
  for (const key of [...requestHeaders.keys()]) requestHeaders.delete(key);
}

// Module stand-ins. Register them in each test file:
//   vi.mock('next/headers', async () => (await import('<path>/test/next-mocks')).nextHeaders);
//   vi.mock('next/navigation', async () => (await import('<path>/test/next-mocks')).nextNavigation);
export const nextHeaders = {
  cookies: async () => cookieStore,
  headers: async () => requestHeaders,
};

export const nextNavigation = {
  redirect: (location: string): never => {
    throw new RedirectSignal(location);
  },
};
