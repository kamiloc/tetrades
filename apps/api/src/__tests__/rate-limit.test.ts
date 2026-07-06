import type { SupabaseClient } from '@supabase/supabase-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setEnvForTests, getEnv } from '../env.js';
import { _setVerifierForTest, type AuthResult } from '../middleware/auth.js';
import {
  ADMIN_ROLES,
  SENSITIVE_PROCEDURES,
  buildRateLimitErrorBody,
  createRateLimitStore,
  parseTrpcProcedures,
  registerRateLimiting,
  resolveRateLimit,
  type RateLimitValues,
} from '../middleware/rateLimit.js';

// ---------------------------------------------------------------------------
// Env + Supabase mock helpers (same pattern as auth-middleware.test.ts)
// ---------------------------------------------------------------------------

const BASE_ENV = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  DATABASE_URL: 'postgresql://postgres:test@localhost:5432/test',
  CORS_ORIGIN: 'http://localhost:3000',
  NODE_ENV: 'test',
  MASTER_ENCRYPTION_KEY: 'a'.repeat(64),
} as const;

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

const LIMITS: RateLimitValues = {
  public: 60,
  authenticated: 200,
  admin: 2000,
  sensitive: 5,
};

beforeEach(() => {
  _setVerifierForTest(undefined);
  setEnvForTests({ ...BASE_ENV });
});

afterEach(() => {
  _setVerifierForTest(undefined);
});

// ---------------------------------------------------------------------------
// parseTrpcProcedures — tRPC URL → procedure paths (handles httpBatchLink)
// ---------------------------------------------------------------------------

describe('parseTrpcProcedures', () => {
  it('parses a single procedure with a query string', () => {
    expect(parseTrpcProcedures('/trpc/athlete.getProfile?input=%7B%7D')).toEqual([
      'athlete.getProfile',
    ]);
  });

  it('parses a comma-separated httpBatchLink batch', () => {
    expect(parseTrpcProcedures('/trpc/athlete.getProfile,sport.list?batch=1')).toEqual([
      'athlete.getProfile',
      'sport.list',
    ]);
  });

  it('parses a URL-encoded comma in a batch', () => {
    expect(parseTrpcProcedures('/trpc/athlete.getProfile%2Csport.list?batch=1')).toEqual([
      'athlete.getProfile',
      'sport.list',
    ]);
  });

  it('returns [] for non-tRPC URLs', () => {
    expect(parseTrpcProcedures('/health')).toEqual([]);
  });

  it('returns [] for the bare /trpc/ prefix', () => {
    expect(parseTrpcProcedures('/trpc/')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveRateLimit — tier selection and bucket keys
// ---------------------------------------------------------------------------

describe('resolveRateLimit', () => {
  const url = '/trpc/athlete.getProfile?input=%7B%7D';

  it('unauthenticated request → public tier keyed by IP', () => {
    const decision = resolveRateLimit({
      url,
      userId: null,
      role: null,
      ip: '203.0.113.9',
      limits: LIMITS,
    });
    expect(decision.tier).toBe('public');
    expect(decision.max).toBe(60);
    expect(decision.key).toBe('public:ip:203.0.113.9');
  });

  it('authenticated request → authenticated tier keyed by userId', () => {
    const decision = resolveRateLimit({
      url,
      userId: 'user-1',
      role: 'ATHLETE',
      ip: '203.0.113.9',
      limits: LIMITS,
    });
    expect(decision.tier).toBe('authenticated');
    expect(decision.max).toBe(200);
    expect(decision.key).toBe('authed:user:user-1');
  });

  it('SYSTEM-role request → admin tier at 10× the authenticated limit', () => {
    const decision = resolveRateLimit({
      url,
      userId: 'admin-1',
      role: 'SYSTEM',
      ip: '203.0.113.9',
      limits: LIMITS,
    });
    expect(decision.tier).toBe('admin');
    expect(decision.max).toBe(2000);
    expect(decision.key).toBe('admin:user:admin-1');
  });

  it('unknown role string falls back to the authenticated tier', () => {
    const decision = resolveRateLimit({
      url,
      userId: 'user-2',
      role: 'VERIFIER',
      ip: '203.0.113.9',
      limits: LIMITS,
    });
    expect(decision.tier).toBe('authenticated');
    expect(decision.max).toBe(200);
  });

  it('sensitive procedure → sensitive tier keyed by userId', () => {
    const decision = resolveRateLimit({
      url: '/trpc/medical.uploadDocument',
      userId: 'user-1',
      role: 'ATHLETE',
      ip: '203.0.113.9',
      limits: LIMITS,
      sensitiveProcedures: new Set(['medical.uploadDocument']),
    });
    expect(decision.tier).toBe('sensitive');
    expect(decision.max).toBe(5);
    expect(decision.key).toBe('sensitive:user:user-1');
  });

  it('a batch containing one sensitive procedure gets the sensitive tier', () => {
    const decision = resolveRateLimit({
      url: '/trpc/athlete.getProfile,medical.uploadDocument?batch=1',
      userId: 'user-1',
      role: 'ATHLETE',
      ip: '203.0.113.9',
      limits: LIMITS,
      sensitiveProcedures: new Set(['medical.uploadDocument']),
    });
    expect(decision.tier).toBe('sensitive');
    expect(decision.max).toBe(5);
  });

  it('sensitive tier wins over admin tier (cost protection applies to everyone)', () => {
    const decision = resolveRateLimit({
      url: '/trpc/medical.uploadDocument',
      userId: 'admin-1',
      role: 'SYSTEM',
      ip: '203.0.113.9',
      limits: LIMITS,
      sensitiveProcedures: new Set(['medical.uploadDocument']),
    });
    expect(decision.tier).toBe('sensitive');
  });

  it('unauthenticated sensitive request falls back to IP-keyed sensitive bucket', () => {
    const decision = resolveRateLimit({
      url: '/trpc/medical.uploadDocument',
      userId: null,
      role: null,
      ip: '203.0.113.9',
      limits: LIMITS,
      sensitiveProcedures: new Set(['medical.uploadDocument']),
    });
    expect(decision.tier).toBe('sensitive');
    expect(decision.key).toBe('sensitive:ip:203.0.113.9');
  });

  it('ships with an empty sensitive set until Sprint 4 wires OCR endpoints', () => {
    expect(SENSITIVE_PROCEDURES.size).toBe(0);
  });

  it('recognizes SYSTEM as the only admin-tier role (per UserRole enum)', () => {
    expect([...ADMIN_ROLES]).toEqual(['SYSTEM']);
  });
});

// ---------------------------------------------------------------------------
// Env-var overrides with tier defaults
// ---------------------------------------------------------------------------

describe('rate limit env configuration', () => {
  it('defaults to 60/200/2000/5 when env vars are absent', () => {
    const env = getEnv();
    expect(env.RATE_LIMIT_PUBLIC).toBe(60);
    expect(env.RATE_LIMIT_AUTHED).toBe(200);
    expect(env.RATE_LIMIT_ADMIN).toBe(2000);
    expect(env.RATE_LIMIT_SENSITIVE).toBe(5);
  });

  it('reads overrides from RATE_LIMIT_* env vars', () => {
    setEnvForTests({
      ...BASE_ENV,
      RATE_LIMIT_PUBLIC: '10',
      RATE_LIMIT_AUTHED: '20',
      RATE_LIMIT_ADMIN: '30',
      RATE_LIMIT_SENSITIVE: '2',
    });
    const env = getEnv();
    expect(env.RATE_LIMIT_PUBLIC).toBe(10);
    expect(env.RATE_LIMIT_AUTHED).toBe(20);
    expect(env.RATE_LIMIT_ADMIN).toBe(30);
    expect(env.RATE_LIMIT_SENSITIVE).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// tRPC-compatible 429 body (superjson envelope, TOO_MANY_REQUESTS = -32029)
// ---------------------------------------------------------------------------

interface TrpcErrorEnvelope {
  error: {
    json: {
      message: string;
      code: number;
      data: { code: string; httpStatus: number };
    };
  };
}

describe('buildRateLimitErrorBody', () => {
  it('shapes a single (non-batch) request as one tRPC error envelope', () => {
    const body = buildRateLimitErrorBody('/trpc/athlete.getProfile?input=%7B%7D', '1 minute');
    expect(Array.isArray(body)).toBe(false);
    const envelope = body as TrpcErrorEnvelope;
    expect(envelope.error.json.code).toBe(-32029);
    expect(envelope.error.json.data.code).toBe('TOO_MANY_REQUESTS');
    expect(envelope.error.json.data.httpStatus).toBe(429);
    expect(envelope.error.json.message).toContain('1 minute');
  });

  it('shapes a batch request as an array with one envelope per procedure', () => {
    const body = buildRateLimitErrorBody('/trpc/athlete.getProfile,sport.list?batch=1', '1 minute');
    expect(Array.isArray(body)).toBe(true);
    const envelopes = body as TrpcErrorEnvelope[];
    expect(envelopes).toHaveLength(2);
    for (const envelope of envelopes) {
      expect(envelope.error.json.code).toBe(-32029);
      expect(envelope.error.json.data.code).toBe('TOO_MANY_REQUESTS');
    }
  });

  it('never leaks internal details in the message', () => {
    const body = buildRateLimitErrorBody('/trpc/athlete.getProfile', '1 minute');
    const envelope = body as TrpcErrorEnvelope;
    expect(envelope.error.json.message).not.toMatch(/prisma|supabase|stack|sql/i);
  });
});

// ---------------------------------------------------------------------------
// Storage factory — in-memory now, Redis swap point for Sprint 4
// ---------------------------------------------------------------------------

describe('createRateLimitStore', () => {
  it('returns no redis/store overrides (in-memory default) in Sprint 3', () => {
    const store = createRateLimitStore();
    expect(store.redis).toBeUndefined();
    expect(store.store).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration — real Fastify + @fastify/rate-limit wiring
// ---------------------------------------------------------------------------

async function buildTestServer(options?: {
  preAuth?: AuthResult;
  roleResolver?: (supabaseUserId: string) => Promise<string | null>;
}): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  if (options?.preAuth) {
    // Simulates upstream auth resolution; registerRateLimiting must not
    // overwrite an already-resolved authResult.
    const preAuth = options.preAuth;
    server.addHook('onRequest', async (req) => {
      req.authResult = preAuth;
    });
  }
  await registerRateLimiting(server, { roleResolver: options?.roleResolver ?? (async () => null) });
  server.all('/trpc/*', async () => ({ ok: true }));
  await server.ready();
  return server;
}

describe('rate limiting integration', () => {
  it('public tier: allows up to the limit per IP, then returns a tRPC-shaped 429', async () => {
    setEnvForTests({ ...BASE_ENV, RATE_LIMIT_PUBLIC: '3' });
    const server = await buildTestServer();

    for (let i = 0; i < 3; i++) {
      const res = await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
      expect(res.statusCode).toBe(200);
    }

    const limited = await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();

    const body = limited.json() as TrpcErrorEnvelope;
    expect(body.error.json.code).toBe(-32029);
    expect(body.error.json.data.code).toBe('TOO_MANY_REQUESTS');
    expect(body.error.json.data.httpStatus).toBe(429);

    await server.close();
  });

  it('authenticated tier: separate per-user bucket with its own limit', async () => {
    setEnvForTests({ ...BASE_ENV, RATE_LIMIT_PUBLIC: '2', RATE_LIMIT_AUTHED: '5' });
    _setVerifierForTest(makeVerifier({ user: { id: 'user-1' }, error: null }));
    const server = await buildTestServer();

    // Exhaust the public (IP) bucket first.
    for (let i = 0; i < 2; i++) {
      await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
    }
    const publicLimited = await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
    expect(publicLimited.statusCode).toBe(429);

    // Authenticated requests from the same IP use the per-user bucket.
    const auth = { authorization: 'Bearer valid.jwt.token' };
    for (let i = 0; i < 5; i++) {
      const res = await server.inject({
        method: 'GET',
        url: '/trpc/athlete.getProfile',
        headers: auth,
      });
      expect(res.statusCode).toBe(200);
    }

    const authedLimited = await server.inject({
      method: 'GET',
      url: '/trpc/athlete.getProfile',
      headers: auth,
    });
    expect(authedLimited.statusCode).toBe(429);
    const body = authedLimited.json() as TrpcErrorEnvelope;
    expect(body.error.json.data.code).toBe('TOO_MANY_REQUESTS');

    await server.close();
  });

  it('admin tier: a SYSTEM-role user is not limited at the authenticated threshold', async () => {
    setEnvForTests({ ...BASE_ENV, RATE_LIMIT_AUTHED: '5', RATE_LIMIT_ADMIN: '50' });
    const server = await buildTestServer({
      preAuth: {
        authenticated: true,
        userId: 'admin-1',
        role: 'SYSTEM',
      },
    });

    for (let i = 0; i < 10; i++) {
      const res = await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
      expect(res.statusCode).toBe(200);
    }

    await server.close();
  });

  it('role resolver output feeds the admin tier for verified users', async () => {
    setEnvForTests({ ...BASE_ENV, RATE_LIMIT_AUTHED: '2', RATE_LIMIT_ADMIN: '8' });
    _setVerifierForTest(makeVerifier({ user: { id: 'system-1' }, error: null }));
    const roleResolver = vi.fn(async () => 'SYSTEM');
    const server = await buildTestServer({ roleResolver });

    const auth = { authorization: 'Bearer valid.jwt.token' };
    for (let i = 0; i < 5; i++) {
      const res = await server.inject({
        method: 'GET',
        url: '/trpc/athlete.getProfile',
        headers: auth,
      });
      expect(res.statusCode).toBe(200);
    }
    expect(roleResolver).toHaveBeenCalledWith('system-1');

    await server.close();
  });

  it('batch request over the limit returns an array of tRPC error envelopes', async () => {
    setEnvForTests({ ...BASE_ENV, RATE_LIMIT_PUBLIC: '1' });
    const server = await buildTestServer();

    await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile,sport.list?batch=1' });
    const limited = await server.inject({
      method: 'GET',
      url: '/trpc/athlete.getProfile,sport.list?batch=1',
    });

    expect(limited.statusCode).toBe(429);
    const body = limited.json() as TrpcErrorEnvelope[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0]?.error.json.data.code).toBe('TOO_MANY_REQUESTS');

    await server.close();
  });

  it('decorates the request with the verified auth result for downstream reuse', async () => {
    _setVerifierForTest(makeVerifier({ user: { id: 'user-9' }, error: null }));
    const server = Fastify({ logger: false });
    await registerRateLimiting(server);
    server.get('/trpc/echo', async (req) => ({
      userId: req.authResult?.userId ?? null,
    }));
    await server.ready();

    const res = await server.inject({
      method: 'GET',
      url: '/trpc/echo',
      headers: { authorization: 'Bearer valid.jwt.token' },
    });
    expect(res.json()).toEqual({ userId: 'user-9' });

    await server.close();
  });
});

// ---------------------------------------------------------------------------
// createContext reuses the request-level auth result (no double verification)
// ---------------------------------------------------------------------------

describe('createContext reuse of req.authResult', () => {
  it('uses the pre-verified auth result instead of verifying again', async () => {
    setEnvForTests({ ...BASE_ENV });
    const { createContext } = await import('../context.js');

    const req = {
      headers: { authorization: 'Bearer would-fail-if-reverified' },
      log: { info: vi.fn() },
      authResult: { authenticated: true, userId: 'pre-verified-user' } as AuthResult,
    };

    const ctx = await createContext({
      req,
      res: {},
    } as unknown as Parameters<typeof createContext>[0]);

    expect(ctx.userId).toBe('pre-verified-user');
  });
});
