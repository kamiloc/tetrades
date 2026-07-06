/**
 * Decryption audit emitter (Sprint 3, task 3.8).
 *
 * Wired into @packages/crypto via initCryptoAudit() at startup (index.ts).
 * Every decryptPII() call lands here with a DecryptionAuditEvent — metadata
 * only (actor, purpose, table/record/field names, requestId); never a
 * decrypted value, so every field of the event is loggable.
 *
 * Two outputs per event, deliberately decoupled:
 *   1. A structured Pino line at `info` — emitted synchronously, so it
 *      exists even when the DB is down.
 *   2. An AuditEvent row — fire-and-forget (never awaited into the request
 *      lifecycle). Failures are captured and logged at `error` with the
 *      audit context so a compliance gap is visible and recoverable.
 */
import type { DecryptionAuditEvent } from '@packages/crypto';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export interface DecryptionAuditDeps {
  prisma: PrismaClient;
  logger: FastifyBaseLogger;
}

export function createDecryptionAuditEmitter(
  deps: DecryptionAuditDeps,
): (event: DecryptionAuditEvent) => void {
  return (event) => {
    // Field NAMES only — the event carries no decrypted values by design.
    const auditLine = {
      requestId: event.requestId,
      event: 'pii_decrypted',
      userId: event.actorId,
      action: event.purpose,
      resource: event.target.table,
      field: event.target.field,
    };

    // The log line always emits, regardless of what the DB write does.
    deps.logger.info(auditLine);

    // Fire-and-forget persistence: a failed write must never throw into the
    // request that triggered the decryption.
    void persistAuditEvent(deps.prisma, event).catch((err: unknown) => {
      deps.logger.error({
        ...auditLine,
        event: 'audit_write_failed',
        error: toLogSafeError(err),
      });
    });
  };
}

async function persistAuditEvent(
  prisma: PrismaClient,
  event: DecryptionAuditEvent,
): Promise<void> {
  const actor = await prisma.userAccount.findUnique({
    where: { supabaseUserId: event.actorId },
    select: { id: true, athlete: { select: { id: true } } },
  });

  // AuditEvent.athleteId is required (RLS scopes audit visibility by it), so
  // an actor without an athlete row cannot be persisted — surface it as a
  // write failure instead of dropping the event silently.
  if (!actor?.athlete) {
    throw new Error('audit actor has no athlete record');
  }

  await prisma.auditEvent.create({
    data: {
      actorUserAccountId: actor.id,
      athleteId: actor.athlete.id,
      eventType: event.action,
      targetType: event.target.table,
      targetId: event.target.recordId,
      purposeCode: event.purpose,
      requestId: event.requestId,
      metadata: { field: event.target.field },
    },
  });
}

/** name + message only — never a raw error object with unknown extra keys. */
function toLogSafeError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { name: 'UnknownError', message: String(err) };
}
