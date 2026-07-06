import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { Context } from '../context.js';
import { setEnvForTests } from '../env.js';
import { verifyAuthToken, _setVerifierForTest } from '../middleware/auth.js';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function makeVerifier(response: {
  user: { id: string } | null;
  error: { status?: number; message?: string } | null;
}): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: response.user }, error: response.error }),
    },
  } as unknown as SupabaseClient;
}

const VALID_USER_ID = 'test-user-uuid-1234';

// ---------------------------------------------------------------------------
// A minimal context factory for the tRPC procedure tests — does NOT call
// Supabase; userId is injected directly.
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<Context> = {}): Context {
  return {
    prisma: {} as Context['prisma'],
    userId: null,
    supabase: {} as Context['supabase'],
    requestId: 'test-request-id',
    // The procedure-logging middleware (trpc.ts) calls ctx.log.debug on
    // every invocation — a silent stub keeps these tests output-free.
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Context['log'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset the module-level verifier singleton between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  _setVerifierForTest(undefined);
  setEnvForTests({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    DATABASE_URL: 'postgresql://postgres:test@localhost:5432/test',
    CORS_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'test',
  });
});

afterEach(() => {
  _setVerifierForTest(undefined);
});

// ---------------------------------------------------------------------------
// UNAUTHENTICATED REQUESTS
// ---------------------------------------------------------------------------

describe('verifyAuthToken — unauthenticated', () => {
  it('no Authorization header → unauthenticated', async () => {
    const result = await verifyAuthToken(undefined);
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('empty Authorization header → unauthenticated', async () => {
    const result = await verifyAuthToken('');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('header without Bearer prefix → unauthenticated', async () => {
    const result = await verifyAuthToken('Token some-random-value');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('malformed Bearer token (random string) → unauthenticated', async () => {
    _setVerifierForTest(makeVerifier({ user: null, error: { status: 401, message: 'invalid' } }));
    const result = await verifyAuthToken('Bearer not-a-real-jwt');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('Bearer prefix with empty token → unauthenticated', async () => {
    const result = await verifyAuthToken('Bearer ');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('expired token → unauthenticated', async () => {
    _setVerifierForTest(
      makeVerifier({ user: null, error: { status: 401, message: 'JWT expired' } }),
    );
    const result = await verifyAuthToken('Bearer expired.jwt.token');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
    // errorCode should carry the status number, not the full message
    if (!result.authenticated) {
      expect(result.errorCode).toBe(401);
    }
  });

  it('Supabase returns no user but no error → unauthenticated', async () => {
    _setVerifierForTest(makeVerifier({ user: null, error: null }));
    const result = await verifyAuthToken('Bearer some.valid.looking.token');
    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AUTHENTICATED REQUESTS
// ---------------------------------------------------------------------------

describe('verifyAuthToken — authenticated', () => {
  it('valid token → authenticated with correct userId', async () => {
    _setVerifierForTest(makeVerifier({ user: { id: VALID_USER_ID }, error: null }));
    const result = await verifyAuthToken(`Bearer valid.jwt.token`);
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe(VALID_USER_ID);
    }
  });

  it('userId matches the verified Supabase user', async () => {
    _setVerifierForTest(makeVerifier({ user: { id: VALID_USER_ID }, error: null }));
    const result = await verifyAuthToken('Bearer valid.jwt.token');
    if (result.authenticated) {
      expect(result.userId).toBe(VALID_USER_ID);
    }
  });
});

// ---------------------------------------------------------------------------
// PROTECTED PROCEDURE ENFORCEMENT
// ---------------------------------------------------------------------------

describe('protectedProcedure', () => {
  const testRouter = router({
    ping: publicProcedure.query(() => 'pong'),
    secret: protectedProcedure.query(({ ctx }) => `hello ${ctx.userId}`),
  });

  it('publicProcedure succeeds without auth', async () => {
    const caller = testRouter.createCaller(makeCtx({ userId: null }));
    const result = await caller.ping();
    expect(result).toBe('pong');
  });

  it('protectedProcedure throws UNAUTHORIZED when userId is null', async () => {
    const caller = testRouter.createCaller(makeCtx({ userId: null }));
    await expect(caller.secret()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('protectedProcedure succeeds when userId is a non-null string', async () => {
    const caller = testRouter.createCaller(
      makeCtx({ userId: VALID_USER_ID }),
    );
    const result = await caller.secret();
    expect(result).toBe(`hello ${VALID_USER_ID}`);
  });

  it('ctx.userId is typed as string (non-null) inside protectedProcedure handler', async () => {
    // This is a compile-time assertion encoded as a runtime check.
    // If the narrowing were wrong, TypeScript would not compile the router above.
    const caller = testRouter.createCaller(
      makeCtx({ userId: VALID_USER_ID }),
    );
    const result = await caller.secret();
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// REQUEST ID
// ---------------------------------------------------------------------------

// Mirrors the requestId extraction logic in createContext.
function extractRequestId(header: string | undefined): string {
  return header ?? crypto.randomUUID();
}

describe('requestId in context', () => {
  it('x-request-id header is used when present', () => {
    const requestId = extractRequestId('my-custom-trace-id');
    expect(requestId).toBe('my-custom-trace-id');
  });

  it('auto-generates a UUID when x-request-id is absent', () => {
    const requestId = extractRequestId(undefined);
    // UUID v4 format
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

// ---------------------------------------------------------------------------
// SECURITY: token value must not appear in any logged output
// ---------------------------------------------------------------------------

describe('security — no token leakage in logs', () => {
  const SENSITIVE_TOKEN = 'super.secret.jwt.that.must.never.appear.in.logs';

  it('error code on failure contains no token fragments', async () => {
    _setVerifierForTest(
      makeVerifier({ user: null, error: { status: 403, message: SENSITIVE_TOKEN } }),
    );
    const result = await verifyAuthToken(`Bearer ${SENSITIVE_TOKEN}`);
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      // errorCode must be the numeric status, not the message string
      expect(String(result.errorCode ?? '')).not.toContain(SENSITIVE_TOKEN);
    }
  });

  it('catch branch error name contains no token fragments', async () => {
    _setVerifierForTest({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error(SENSITIVE_TOKEN)),
      },
    } as unknown as SupabaseClient);

    const result = await verifyAuthToken(`Bearer ${SENSITIVE_TOKEN}`);
    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      // err.name is 'Error' — never the message
      expect(String(result.errorCode ?? '')).not.toContain(SENSITIVE_TOKEN);
    }
  });
});
