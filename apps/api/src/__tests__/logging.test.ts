import { Writable } from 'node:stream';

import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect } from 'vitest';

import {
  buildLoggerOptions,
  genReqId,
  registerRequestLogging,
} from '../middleware/logging.js';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Log capture — every chunk must parse as JSON (success criterion 8)
// ---------------------------------------------------------------------------

interface LogSink {
  lines: Record<string, unknown>[];
  raw: string[];
  stream: Writable;
}

function createLogSink(): LogSink {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim().length === 0) continue;
        raw.push(line);
        // Throws (failing the test) if any output line is not valid JSON.
        lines.push(JSON.parse(line) as Record<string, unknown>);
      }
      callback();
    },
  });
  return { lines, raw, stream };
}

/**
 * A Fastify instance wired exactly like index.ts (production logger options,
 * genReqId, requestIdLogLabel, summary hook) but writing to a capture stream.
 */
async function buildServer(sink: LogSink): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { ...buildLoggerOptions('production'), stream: sink.stream },
    genReqId,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true,
  });

  // Simulates the rate-limit onRequest hook resolving auth + tier.
  server.addHook('onRequest', async (req) => {
    req.authResult = { authenticated: true, userId: 'user-1' };
    req.rateLimitDecision = { tier: 'authenticated', key: 'authed:user:user-1', max: 200 };
  });

  registerRequestLogging(server);

  server.get('/trpc/athlete.getProfile', async (req) => {
    req.log.info({ marker: 'in-handler' });
    req.log.debug({ marker: 'debug-only' });
    return { ok: true };
  });

  server.post('/leaky', async (req) => {
    // A hallucinated log call passing secrets — redaction must censor these.
    req.log.info({
      token: 'super-secret-jwt',
      nested: { password: 'hunter2', apiKey: 'sk-ant-xyz' },
      headers: { authorization: 'Bearer abc.def.ghi' },
      field: 'documentTypeEnc',
    });
    return { ok: true };
  });

  await server.ready();
  return server;
}

// ---------------------------------------------------------------------------
// buildLoggerOptions — level and transport per environment
// ---------------------------------------------------------------------------

describe('buildLoggerOptions', () => {
  it('production: info level (debug disabled), no pretty transport', () => {
    const options = buildLoggerOptions('production');
    expect(options.level).toBe('info');
    expect(options.transport).toBeUndefined();
  });

  it('development: debug level with pino-pretty transport', () => {
    const options = buildLoggerOptions('development');
    expect(options.level).toBe('debug');
    expect(options.transport).toEqual({ target: 'pino-pretty' });
  });

  it('test: debug level, plain JSON output', () => {
    const options = buildLoggerOptions('test');
    expect(options.level).toBe('debug');
    expect(options.transport).toBeUndefined();
  });

  it('always censors redacted paths', () => {
    expect(buildLoggerOptions('production').redact.censor).toBe('[REDACTED]');
    expect(buildLoggerOptions('production').redact.paths.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// genReqId — UUID v4 at ingress, header reuse only for valid UUIDs
// ---------------------------------------------------------------------------

describe('genReqId', () => {
  it('generates a UUID v4 when no x-request-id header is present', () => {
    expect(genReqId({ headers: {} })).toMatch(UUID_V4_PATTERN);
  });

  it('reuses a valid UUID v4 from x-request-id', () => {
    const id = '3f2b1a9c-8d7e-4f6a-9b0c-1d2e3f4a5b6c';
    expect(genReqId({ headers: { 'x-request-id': id } })).toBe(id);
  });

  it('replaces a non-UUID header value (log-injection attempt)', () => {
    const generated = genReqId({
      headers: { 'x-request-id': 'evil"\n{"level":50,"msg":"forged"}' },
    });
    expect(generated).toMatch(UUID_V4_PATTERN);
  });

  it('replaces a UUID of the wrong version', () => {
    // Version 1 UUID — valid shape, wrong version nibble.
    const v1 = 'a6f2c9e0-5b3d-11ee-8c99-0242ac120002';
    expect(genReqId({ headers: { 'x-request-id': v1 } })).not.toBe(v1);
  });
});

// ---------------------------------------------------------------------------
// Request summary line + requestId propagation (integration)
// ---------------------------------------------------------------------------

describe('request summary logging', () => {
  it('emits one summary line with the full task 3.8 schema', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    const res = await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
    expect(res.statusCode).toBe(200);

    const summary = sink.lines.find((line) => line['msg'] === 'request completed');
    expect(summary).toBeDefined();
    expect(summary).toMatchObject({
      method: 'GET',
      url: '/trpc/athlete.getProfile',
      statusCode: 200,
      userId: 'user-1',
      rateLimitTier: 'authenticated',
    });
    expect(summary?.['requestId']).toMatch(UUID_V4_PATTERN);
    expect(typeof summary?.['responseTime']).toBe('number');

    await server.close();
  });

  it('binds the same requestId to every line of one request', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });

    const handlerLine = sink.lines.find((line) => line['marker'] === 'in-handler');
    const summary = sink.lines.find((line) => line['msg'] === 'request completed');
    expect(handlerLine?.['requestId']).toMatch(UUID_V4_PATTERN);
    expect(handlerLine?.['requestId']).toBe(summary?.['requestId']);

    await server.close();
  });

  it('gives distinct requestIds to distinct requests', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });
    await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });

    const summaries = sink.lines.filter((line) => line['msg'] === 'request completed');
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.['requestId']).not.toBe(summaries[1]?.['requestId']);

    await server.close();
  });

  it('propagates a valid caller-supplied x-request-id into the log lines', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);
    const id = '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

    await server.inject({
      method: 'GET',
      url: '/trpc/athlete.getProfile',
      headers: { 'x-request-id': id },
    });

    const summary = sink.lines.find((line) => line['msg'] === 'request completed');
    expect(summary?.['requestId']).toBe(id);

    await server.close();
  });

  it('suppresses debug lines at the production level', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    await server.inject({ method: 'GET', url: '/trpc/athlete.getProfile' });

    expect(sink.lines.find((line) => line['marker'] === 'debug-only')).toBeUndefined();

    await server.close();
  });
});

// ---------------------------------------------------------------------------
// PII / secret suppression (success criterion 5)
// ---------------------------------------------------------------------------

describe('log redaction', () => {
  it('censors secret-bearing keys at the top level and one level deep', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    await server.inject({ method: 'POST', url: '/leaky' });

    const leaky = sink.lines.find((line) => line['field'] === 'documentTypeEnc');
    expect(leaky).toBeDefined();
    expect(leaky?.['token']).toBe('[REDACTED]');
    expect((leaky?.['nested'] as Record<string, unknown>)['password']).toBe('[REDACTED]');
    expect((leaky?.['nested'] as Record<string, unknown>)['apiKey']).toBe('[REDACTED]');
    expect((leaky?.['headers'] as Record<string, unknown>)['authorization']).toBe('[REDACTED]');
    // Field NAMES stay loggable — only values are suppressed.
    expect(leaky?.['field']).toBe('documentTypeEnc');

    await server.close();
  });

  it('never lets the raw secret values reach the output stream', async () => {
    const sink = createLogSink();
    const server = await buildServer(sink);

    await server.inject({ method: 'POST', url: '/leaky' });

    const output = sink.raw.join('\n');
    expect(output).not.toContain('super-secret-jwt');
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('sk-ant-xyz');
    expect(output).not.toContain('Bearer abc.def.ghi');

    await server.close();
  });
});
