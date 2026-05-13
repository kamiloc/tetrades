import type { AuditContext, AuditEmitter, DecryptionAuditEvent } from './types.js';

/**
 * Module-level reference to the audit emitter.
 * Set by initCryptoAudit() at application startup.
 * If not set, decryptPII will throw — audit is mandatory.
 */
let auditEmitter: AuditEmitter | null = null;

/**
 * Initializes the audit emitter. Must be called once at application startup
 * before any decryption operations.
 *
 * The emitter receives a DecryptionAuditEvent and writes it to the audit_log
 * table. The API layer provides this function — @packages/crypto does not
 * know about Prisma or Supabase.
 *
 * Example (in apps/api/src/server.ts):
 *   initCryptoAudit(async (event) => {
 *     await prisma.auditEvent.create({ data: { ...event } });
 *   });
 */
export function initCryptoAudit(emitter: AuditEmitter): void {
  auditEmitter = emitter;
}

/**
 * Emits an audit event for a decryption operation.
 * INTERNAL — not re-exported from the package index.
 *
 * Throws if initCryptoAudit() has not been called. The audit event is
 * fire-and-forget in production — a failed audit write does NOT block
 * decryption, but errors are logged via console.error.
 */
export function emitDecryptionAudit(ctx: AuditContext): void {
  if (!auditEmitter) {
    throw new Error(
      'Crypto audit emitter not initialized. Call initCryptoAudit() at startup.',
    );
  }

  const event: DecryptionAuditEvent = {
    actorId: ctx.actorId,
    action: 'DECRYPT_PII',
    target: {
      table: ctx.targetTable,
      recordId: ctx.targetRecordId,
      field: ctx.targetField,
    },
    purpose: ctx.purpose,
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget: don't block decryption on audit write failure.
  try {
    const result = auditEmitter(event);
    if (result instanceof Promise) {
      result.catch((err: unknown) => {
        // Cannot import Pino here (package boundary), so console.error is the
        // last-resort fallback. The API layer's emitter handles its own logging.
        console.error('[crypto] Audit emission failed:', err);
      });
    }
  } catch (err: unknown) {
    console.error('[crypto] Audit emission failed:', err);
  }
}
