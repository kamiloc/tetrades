import type { DecryptionAuditEvent } from '@packages/crypto';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { describe, it, expect, vi } from 'vitest';

import { createDecryptionAuditEmitter } from '../services/audit.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVENT: DecryptionAuditEvent = {
  actorId: 'supabase-user-1',
  action: 'DECRYPT_PII',
  target: {
    table: 'athlete_private_profiles',
    recordId: 'athlete-1',
    field: 'govIdEnc',
  },
  purpose: 'getProfile',
  requestId: '2a9c8b7d-6e5f-4a3b-9c1d-0e2f3a4b5c6d',
  timestamp: '2026-07-06T12:00:00.000Z',
};

const EXPECTED_LOG_LINE = {
  requestId: EVENT.requestId,
  event: 'pii_decrypted',
  userId: 'supabase-user-1',
  action: 'getProfile',
  resource: 'athlete_private_profiles',
  field: 'govIdEnc',
};

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

function makeLogger(): MockLogger {
  return { info: vi.fn(), error: vi.fn() };
}

function makePrisma(overrides?: {
  findUnique?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
}): {
  userAccount: { findUnique: ReturnType<typeof vi.fn> };
  auditEvent: { create: ReturnType<typeof vi.fn> };
} {
  return {
    userAccount: {
      findUnique:
        overrides?.findUnique ??
        vi.fn().mockResolvedValue({ id: 'ua-1', athlete: { id: 'athlete-1' } }),
    },
    auditEvent: {
      create: overrides?.create ?? vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };
}

function makeEmitter(prisma: ReturnType<typeof makePrisma>, logger: MockLogger) {
  return createDecryptionAuditEmitter({
    prisma: prisma as unknown as PrismaClient,
    logger: logger as unknown as FastifyBaseLogger,
  });
}

// ---------------------------------------------------------------------------
// Structured audit log line
// ---------------------------------------------------------------------------

describe('decryption audit log line', () => {
  it('emits an info line with the exact task 3.8 audit schema', () => {
    const logger = makeLogger();
    const emit = makeEmitter(makePrisma(), logger);

    emit(EVENT);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(EXPECTED_LOG_LINE);
  });

  it('logs field NAMES only — no decrypted value can appear', () => {
    const logger = makeLogger();
    const emit = makeEmitter(makePrisma(), logger);

    emit(EVENT);

    const logged = logger.info.mock.calls[0]?.[0] as Record<string, unknown>;
    // The line is built exclusively from audit metadata keys.
    expect(Object.keys(logged).sort()).toEqual(
      ['action', 'event', 'field', 'requestId', 'resource', 'userId'].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Fire-and-forget AuditEvent persistence
// ---------------------------------------------------------------------------

describe('AuditEvent persistence', () => {
  it('writes the AuditEvent row with the mapped audit context', async () => {
    const prisma = makePrisma();
    const emit = makeEmitter(prisma, makeLogger());

    emit(EVENT);

    await vi.waitFor(() => {
      expect(prisma.auditEvent.create).toHaveBeenCalledTimes(1);
    });
    expect(prisma.userAccount.findUnique).toHaveBeenCalledWith({
      where: { supabaseUserId: 'supabase-user-1' },
      select: { id: true, athlete: { select: { id: true } } },
    });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: {
        actorUserAccountId: 'ua-1',
        athleteId: 'athlete-1',
        eventType: 'DECRYPT_PII',
        targetType: 'athlete_private_profiles',
        targetId: 'athlete-1',
        purposeCode: 'getProfile',
        requestId: EVENT.requestId,
        metadata: { field: 'govIdEnc' },
      },
    });
  });

  it('returns synchronously — the DB write is never awaited', () => {
    // create() stays pending forever; the emitter must return regardless.
    const pending = new Promise<never>(() => undefined);
    const prisma = makePrisma({ create: vi.fn().mockReturnValue(pending) });
    const logger = makeLogger();
    const emit = makeEmitter(prisma, logger);

    emit(EVENT);

    // The log line already exists while the write is still in flight.
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('does not throw and still logs the audit line when the DB write fails', async () => {
    const prisma = makePrisma({
      create: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    const logger = makeLogger();
    const emit = makeEmitter(prisma, logger);

    expect(() => {
      emit(EVENT);
    }).not.toThrow();

    expect(logger.info).toHaveBeenCalledWith(EXPECTED_LOG_LINE);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    expect(logger.error).toHaveBeenCalledWith({
      ...EXPECTED_LOG_LINE,
      event: 'audit_write_failed',
      error: { name: 'Error', message: 'connection refused' },
    });
  });

  it('captures the failed audit context without any PII values on error', async () => {
    const prisma = makePrisma({
      create: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    const logger = makeLogger();
    const emit = makeEmitter(prisma, logger);

    emit(EVENT);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    const errorLine = logger.error.mock.calls[0]?.[0] as Record<string, unknown>;
    // Only audit metadata + a name/message error shape — nothing else can
    // smuggle a decrypted value or raw _Enc bytes into the error log.
    expect(Object.keys(errorLine).sort()).toEqual(
      ['action', 'error', 'event', 'field', 'requestId', 'resource', 'userId'].sort(),
    );
    expect(Object.keys(errorLine['error'] as Record<string, unknown>).sort()).toEqual([
      'message',
      'name',
    ]);
  });

  it('logs an error when the actor has no athlete record (row not persistable)', async () => {
    const prisma = makePrisma({
      findUnique: vi.fn().mockResolvedValue(null),
    });
    const logger = makeLogger();
    const emit = makeEmitter(prisma, logger);

    emit(EVENT);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
    const errorLine = logger.error.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(errorLine['event']).toBe('audit_write_failed');
  });

  it('handles non-Error rejections without leaking arbitrary shapes', async () => {
    const prisma = makePrisma({
      create: vi.fn().mockRejectedValue('string failure'),
    });
    const logger = makeLogger();
    const emit = makeEmitter(prisma, logger);

    emit(EVENT);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    const errorLine = logger.error.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(errorLine['error']).toEqual({ name: 'UnknownError', message: 'string failure' });
  });
});
