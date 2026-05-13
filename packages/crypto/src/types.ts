/**
 * The serialized payload stored in the database as Bytes.
 * Contains everything needed to decrypt: wrapped DEK, IV, auth tag, ciphertext.
 * Serialized as JSON, then converted to Buffer for Prisma Bytes storage.
 */
export interface EncryptedPayload {
  /** Version of the encryption scheme — allows future algorithm migration */
  version: 1;
  /** AES-256-GCM initialization vector (base64, 12 bytes) */
  iv: string;
  /** AES-256-GCM authentication tag (base64, 16 bytes) */
  authTag: string;
  /** The encrypted plaintext (base64) */
  ciphertext: string;
  /** The DEK encrypted with the master key (base64) */
  wrappedDek: string;
  /** IV used to wrap the DEK (base64, 12 bytes) */
  dekIv: string;
  /** Auth tag from DEK wrapping (base64, 16 bytes) */
  dekAuthTag: string;
}

/**
 * Context required for audit logging on every decryption call.
 * The decryptPII function REFUSES to run without this context.
 */
export interface AuditContext {
  /** The userId performing the decryption (from tRPC ctx.userId) */
  actorId: string;
  /** Why this decryption is happening */
  purpose: string;
  /** The table containing the encrypted field */
  targetTable: string;
  /** The record ID being decrypted */
  targetRecordId: string;
  /** The specific field being decrypted */
  targetField: string;
  /** Correlation ID from the tRPC request */
  requestId: string;
}

/**
 * The audit event emitted on every decryption.
 * Written to the audit_log table by the API layer.
 */
export interface DecryptionAuditEvent {
  actorId: string;
  action: 'DECRYPT_PII';
  target: {
    table: string;
    recordId: string;
    field: string;
  };
  purpose: string;
  requestId: string;
  timestamp: string;
}

/**
 * Callback function type for audit event emission.
 * The API layer provides this when initializing the crypto package.
 */
export type AuditEmitter = (event: DecryptionAuditEvent) => void | Promise<void>;
