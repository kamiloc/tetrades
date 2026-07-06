import { createDecipheriv } from 'node:crypto';

import { emitDecryptionAudit } from './audit.js';
import { bufferToPayload, parseMasterKey } from './helpers.js';
import type { AuditContext } from './types.js';

/**
 * Decrypts a ciphertext Buffer back to a plaintext string.
 *
 * Deserializes the encrypted payload from the Prisma Bytes buffer, unwraps
 * the DEK using the master key, decrypts the ciphertext, then emits a
 * mandatory audit event before returning plaintext.
 *
 * For JSON data, parse after decryption:
 *   const data = JSON.parse(decryptPII(buffer, masterKeyHex, auditCtx));
 *
 * @param encryptedBuffer - The Buffer from Prisma Bytes storage.
 * @param masterKeyHex - The master key as a 64-character hex string.
 * @param auditContext - MANDATORY. Decryption without audit is forbidden.
 * @returns The decrypted plaintext string.
 * @throws If the buffer is malformed, the key is wrong, or data was tampered.
 */
export function decryptPII(
  encryptedBuffer: Buffer,
  masterKeyHex: string,
  auditContext: AuditContext,
): string {
  // 0. Validate audit context — all fields must be present and non-empty
  validateAuditContext(auditContext);

  const masterKey = parseMasterKey(masterKeyHex);
  const payload = bufferToPayload(encryptedBuffer);

  // 1. Unwrap the DEK using the master key
  const dekDecipher = createDecipheriv(
    'aes-256-gcm',
    masterKey,
    Buffer.from(payload.dekIv, 'base64'),
  );
  dekDecipher.setAuthTag(Buffer.from(payload.dekAuthTag, 'base64'));
  const dek = Buffer.concat([
    dekDecipher.update(Buffer.from(payload.wrappedDek, 'base64')),
    dekDecipher.final(),
  ]);

  // 2. Decrypt the ciphertext using the DEK
  const dataDecipher = createDecipheriv(
    'aes-256-gcm',
    dek,
    Buffer.from(payload.iv, 'base64'),
  );
  dataDecipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    dataDecipher.update(Buffer.from(payload.ciphertext, 'base64')),
    dataDecipher.final(),
  ]).toString('utf-8');

  // 3. Zero out the DEK from memory
  dek.fill(0);

  // 4. Emit audit event BEFORE returning plaintext
  emitDecryptionAudit(auditContext);

  return plaintext;
}

function validateAuditContext(ctx: AuditContext): void {
  if (!ctx.actorId.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: actorId. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
  if (!ctx.purpose.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: purpose. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
  if (!ctx.targetTable.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: targetTable. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
  if (!ctx.targetRecordId.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: targetRecordId. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
  if (!ctx.targetField.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: targetField. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
  if (!ctx.requestId.trim())
    throw new Error(
      'decryptPII requires a complete AuditContext. Missing or empty field: requestId. ' +
        'Decryption without audit is forbidden per CLAUDE.md.',
    );
}
