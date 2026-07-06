/**
 * Tiered rate limiting for the tRPC API (Sprint 3, task 3.7).
 *
 * Tiers (requests per minute, env-overridable via RATE_LIMIT_*):
 *   - public:        unauthenticated requests, keyed by IP
 *   - authenticated: verified users, keyed by userId
 *   - admin:         admin-role users, keyed by userId (10× authenticated)
 *   - sensitive:     OCR/upload endpoints (Sprint 4), keyed by userId
 *
 * Admin tier: per Cristian's decision (2026-07-05), the SYSTEM value of
 * `UserRole` maps to the admin tier. The role is resolved via a TTL-cached
 * UserAccount lookup (lib/userRole.ts) — at most one DB query per user per
 * minute, failing soft to the authenticated tier.
 *
 * Rate-limited responses are shaped as tRPC error envelopes (superjson
 * transformer, TOO_MANY_REQUESTS) so `@packages/api-client` surfaces them as
 * regular TRPCClientError instances, not opaque HTTP failures.
 */
import rateLimit, { type RateLimitPluginOptions } from '@fastify/rate-limit';
import { TRPC_ERROR_CODES_BY_KEY } from '@trpc/server/rpc';
import type { FastifyError, FastifyInstance, FastifyRequest } from 'fastify';
import superjson from 'superjson';
import type { SuperJSONResult } from 'superjson';

import { getEnv } from '../env.js';
import { createCachedRoleResolver, type RoleResolver } from '../lib/userRole.js';

import { verifyAuthToken } from './auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Tier decision computed once per request by decisionFor() below; read
     * by the request-summary log line (middleware/logging.ts). Unlike
     * `authResult`, this augmentation may live here: nothing in the Next.js
     * TS program (which includes context.ts via the AppRouter type import)
     * references it.
     */
    rateLimitDecision?: RateLimitDecision;
  }
}

/** Counters reset every minute; only the per-tier maximums are configurable. */
const RATE_LIMIT_WINDOW_MS = 60_000;

const TRPC_PREFIX = '/trpc/';

/**
 * Roles that receive the admin tier. SYSTEM is the service-account role in
 * the UserRole enum; Cristian approved mapping it to the admin tier.
 */
export const ADMIN_ROLES: ReadonlySet<string> = new Set(['SYSTEM']);

/**
 * Procedures throttled at the sensitive tier. Empty in Sprint 3 — Sprint 4
 * adds the medicalRouter OCR/upload procedures here (e.g.
 * 'medical.uploadDocument') without touching any other rate limit code.
 */
export const SENSITIVE_PROCEDURES: ReadonlySet<string> = new Set();

export interface RateLimitValues {
  public: number;
  authenticated: number;
  admin: number;
  sensitive: number;
}

export type RateLimitTier = keyof RateLimitValues;

export interface RateLimitDecision {
  tier: RateLimitTier;
  /** Bucket key; tier-prefixed so tiers never share counters. */
  key: string;
  max: number;
}

/**
 * Extract procedure paths from a tRPC request URL. Handles single calls
 * (`/trpc/athlete.getProfile?input=…`) and httpBatchLink batches
 * (`/trpc/a.b,c.d?batch=1`). Non-tRPC URLs yield [].
 */
export function parseTrpcProcedures(url: string): string[] {
  const path = url.split('?')[0] ?? '';
  if (!path.startsWith(TRPC_PREFIX)) return [];
  const raw = decodeURIComponent(path.slice(TRPC_PREFIX.length));
  return raw
    .split(',')
    .map((procedure) => procedure.trim())
    .filter((procedure) => procedure.length > 0);
}

export interface ResolveRateLimitArgs {
  url: string;
  userId: string | null;
  role: string | null;
  ip: string;
  limits: RateLimitValues;
  /** Injectable for tests; defaults to SENSITIVE_PROCEDURES. */
  sensitiveProcedures?: ReadonlySet<string>;
}

/**
 * Pick the tier, bucket key, and maximum for a request.
 * Priority: sensitive > admin > authenticated > public. Sensitive outranks
 * admin because it protects expensive downstream resources (Claude OCR),
 * which no role is exempt from.
 */
export function resolveRateLimit(args: ResolveRateLimitArgs): RateLimitDecision {
  const sensitiveSet = args.sensitiveProcedures ?? SENSITIVE_PROCEDURES;
  const procedures = parseTrpcProcedures(args.url);

  if (procedures.some((procedure) => sensitiveSet.has(procedure))) {
    const subject = args.userId === null ? `ip:${args.ip}` : `user:${args.userId}`;
    return { tier: 'sensitive', key: `sensitive:${subject}`, max: args.limits.sensitive };
  }

  if (args.userId !== null && args.role !== null && ADMIN_ROLES.has(args.role)) {
    return { tier: 'admin', key: `admin:user:${args.userId}`, max: args.limits.admin };
  }

  if (args.userId !== null) {
    return { tier: 'authenticated', key: `authed:user:${args.userId}`, max: args.limits.authenticated };
  }

  return { tier: 'public', key: `public:ip:${args.ip}`, max: args.limits.public };
}

export interface RateLimitErrorEnvelope {
  error: SuperJSONResult;
}

/**
 * Shape a 429 body exactly as tRPC (with the superjson transformer) shapes
 * procedure errors, so httpBatchLink parses it into a TRPCClientError with
 * `data.code === 'TOO_MANY_REQUESTS'`. Batch requests receive one envelope
 * per procedure in the batch.
 */
export function buildRateLimitErrorBody(
  url: string,
  after: string,
): RateLimitErrorEnvelope | RateLimitErrorEnvelope[] {
  const envelope: RateLimitErrorEnvelope = {
    error: superjson.serialize({
      message: `Too many requests. Try again in ${after}.`,
      code: TRPC_ERROR_CODES_BY_KEY.TOO_MANY_REQUESTS,
      data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429 },
    }),
  };

  const isBatch = new URLSearchParams(url.split('?')[1] ?? '').get('batch') === '1';
  if (!isBatch) return envelope;

  const count = Math.max(parseTrpcProcedures(url).length, 1);
  return Array.from({ length: count }, () => envelope);
}

/**
 * Thrown by the plugin's errorResponseBuilder when a bucket is exhausted
 * (@fastify/rate-limit `throw`s the builder's return value). The error
 * handler below unwraps it into the tRPC-shaped 429 response.
 */
export class RateLimitExceededError extends Error {
  readonly statusCode: number;
  readonly body: RateLimitErrorEnvelope | RateLimitErrorEnvelope[];

  constructor(statusCode: number, body: RateLimitErrorEnvelope | RateLimitErrorEnvelope[]) {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export type RateLimitStoreOptions = Pick<RateLimitPluginOptions, 'redis' | 'store'>;

/**
 * Storage for rate-limit counters, isolated so Sprint 4 can move to Redis
 * (shared with BullMQ) by returning `{ redis: <ioredis client> }` here —
 * a single config change with no impact on tier logic.
 *
 * Sprint 3 intentionally returns no overrides: the plugin's in-memory store
 * is correct for a single long-running container.
 */
export function createRateLimitStore(): RateLimitStoreOptions {
  return {};
}

export interface RegisterRateLimitingOptions {
  /**
   * Maps a verified supabaseUserId to a role for tier selection. Defaults to
   * the TTL-cached Prisma lookup in lib/userRole.ts. Injectable for tests.
   */
  roleResolver?: RoleResolver;
}

/**
 * Register the once-per-request auth verification hook and the
 * @fastify/rate-limit plugin. Must be called before the tRPC plugin so the
 * limiter runs ahead of procedure execution.
 */
export async function registerRateLimiting(
  server: FastifyInstance,
  options: RegisterRateLimitingOptions = {},
): Promise<void> {
  const env = getEnv();
  const limits: RateLimitValues = {
    public: env.RATE_LIMIT_PUBLIC,
    authenticated: env.RATE_LIMIT_AUTHED,
    admin: env.RATE_LIMIT_ADMIN,
    sensitive: env.RATE_LIMIT_SENSITIVE,
  };

  // The default resolver is imported lazily: lib/prisma.js validates env at
  // module load, which must not run when tests inject their own resolver.
  const roleResolver =
    options.roleResolver ??
    createCachedRoleResolver((await import('../lib/prisma.js')).prisma);

  // Verify the Supabase JWT once per request; createContext() reuses the
  // result, so rate limiting adds zero extra verification calls. A hook
  // registered earlier may have already resolved authResult — keep it.
  server.addHook('onRequest', async (req) => {
    if (req.authResult === undefined) {
      const result = await verifyAuthToken(req.headers['authorization']);
      if (result.authenticated && result.role === undefined) {
        const role = await roleResolver(result.userId);
        req.authResult = role === null ? result : { ...result, role };
      } else {
        req.authResult = result;
      }
    }
  });

  // Computed lazily on first use (after the onRequest hook resolved
  // authResult) and cached on the request for the keyGenerator/max callbacks
  // and the request-summary log line.
  const decisionFor = (req: FastifyRequest): RateLimitDecision => {
    if (req.rateLimitDecision) return req.rateLimitDecision;
    const auth = req.authResult;
    const decision = resolveRateLimit({
      url: req.url,
      userId: auth?.userId ?? null,
      role: auth?.authenticated === true ? (auth.role ?? null) : null,
      ip: req.ip,
      limits,
    });
    req.rateLimitDecision = decision;
    return decision;
  };

  await server.register(rateLimit, {
    global: true,
    timeWindow: RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) => decisionFor(req).key,
    max: (req) => decisionFor(req).max,
    errorResponseBuilder: (req, context) => {
      req.log.warn({
        event: 'rate_limit_exceeded',
        tier: decisionFor(req).tier,
        ip: req.ip,
        userId: req.authResult?.userId ?? null,
      });
      return new RateLimitExceededError(
        context.statusCode,
        buildRateLimitErrorBody(req.url, context.after),
      );
    },
    ...createRateLimitStore(),
  });

  // Unwrap rate-limit errors into the tRPC envelope; everything else keeps
  // Fastify's default error behavior. tRPC procedure errors never reach this
  // handler — the tRPC plugin shapes those itself.
  server.setErrorHandler((err: FastifyError | RateLimitExceededError, req, reply) => {
    if (err instanceof RateLimitExceededError) {
      void reply.status(err.statusCode).send(err.body);
      return;
    }
    // Fastify's default error log is bypassed by a custom handler, so emit
    // it here — name/message only, never headers or request bodies.
    req.log.error(
      { error: { name: err.name, message: err.message }, statusCode: err.statusCode ?? 500 },
      'unhandled error',
    );
    void reply.status(err.statusCode ?? 500).send(err);
  });
}
