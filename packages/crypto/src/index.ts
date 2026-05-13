/**
 * @packages/crypto — Envelope Encryption for L2-CONFIDENTIAL data
 *
 * Public API (exactly three functions + four types):
 *   - encryptPII:      Encrypt a plaintext string → Buffer (for Prisma Bytes)
 *   - decryptPII:      Decrypt a Buffer → plaintext string (requires audit context)
 *   - initCryptoAudit: Register the audit emitter (called once at app startup)
 *
 * Types re-exported for consumers:
 *   - AuditContext, EncryptedPayload, DecryptionAuditEvent, AuditEmitter
 *
 * Nothing else is exported. Internal helpers (helpers.ts, audit internals)
 * are not part of the public API.
 */

export { encryptPII } from './encrypt.js';
export { decryptPII } from './decrypt.js';
export { initCryptoAudit } from './audit.js';

export type {
  AuditContext,
  AuditEmitter,
  DecryptionAuditEvent,
  EncryptedPayload,
} from './types.js';
