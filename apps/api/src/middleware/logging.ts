/**
 * Structured request/response logging (Sprint 3, task 3.8).
 *
 * Configures the Pino instance Fastify already ships with — this module
 * builds options for it and registers hooks; it never creates a second
 * logger. Three concerns live here:
 *
 *   1. buildLoggerOptions — level per environment (debug lines are disabled
 *      in production), key-based redaction as defense-in-depth against
 *      L2/L3 values reaching a log line, pino-pretty in development only.
 *   2. genReqId — UUID v4 request IDs via Fastify's built-in request.id
 *      mechanism. An incoming x-request-id header is honored only when it
 *      is itself a UUID v4 (anything else is a spoofing/log-injection risk).
 *   3. registerRequestLogging — one structured summary line per response.
 *
 * Every line emitted through req.log carries the requestId binding because
 * index.ts sets `requestIdLogLabel: 'requestId'` on the Fastify instance.
 */
import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import type { Env } from '../env.js';

/** RFC 4122 version-4 UUID — the only shape accepted from x-request-id. */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Keys censored in every log line, at the top level and one level deep.
 * This is a safety net, not the primary control: the primary rule is that
 * call sites never pass L2/L3 values to the logger in the first place
 * (log field *names* and presence, never values). Covers L3 credentials
 * (tokens, keys) and the encryption-adjacent keys a hallucinated log call
 * would most plausibly use for L2 data.
 */
export const REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'authorization',
  'cookie',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'jwt',
  'password',
  'secret',
  'masterKey',
  'plaintext',
  'ciphertext',
  '*.authorization',
  '*.cookie',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.jwt',
  '*.password',
  '*.secret',
  '*.masterKey',
  '*.plaintext',
  '*.ciphertext',
];

/**
 * Subset of Pino options this app configures. Structurally compatible with
 * Fastify's `logger` option; kept as a named type so tests can build the
 * exact production/development configurations.
 */
export interface ApiLoggerOptions {
  level: 'debug' | 'info';
  redact: { paths: string[]; censor: string };
  transport?: { target: string };
}

export function buildLoggerOptions(nodeEnv: Env['NODE_ENV']): ApiLoggerOptions {
  const options: ApiLoggerOptions = {
    // debug (procedure entry/exit) is disabled in production.
    level: nodeEnv === 'production' ? 'info' : 'debug',
    redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
  };

  if (nodeEnv === 'development') {
    // pino-pretty is a devDependency; production stays newline-delimited JSON.
    options.transport = { target: 'pino-pretty' };
  }

  return options;
}

/**
 * Request ID generator for Fastify's `genReqId` option. Reuses a caller's
 * x-request-id for cross-service correlation, but only when it is a valid
 * UUID v4 — otherwise a fresh one is generated so arbitrary header content
 * can never enter the logs as a requestId.
 */
export function genReqId(req: { headers: NodeJS.Dict<string | string[]> }): string {
  const header = req.headers['x-request-id'];
  const candidate = Array.isArray(header) ? header[0] : header;

  if (candidate !== undefined && UUID_V4_PATTERN.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

/**
 * Emit one structured summary line per response. Replaces Fastify's default
 * request logging (index.ts sets `disableRequestLogging: true`), which lacks
 * userId and the applied rate-limit tier.
 *
 * userId is the Supabase auth UUID (L0 — metadata, not PII); it comes from
 * req.authResult, resolved once per request by the rate-limit onRequest
 * hook. rateLimitTier comes from the decision cached by rateLimit.ts.
 */
export function registerRequestLogging(server: FastifyInstance): void {
  server.addHook('onResponse', (req, reply, done) => {
    req.log.info(
      {
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime),
        userId: req.authResult?.userId ?? null,
        rateLimitTier: req.rateLimitDecision?.tier ?? null,
      },
      'request completed',
    );
    done();
  });
}
