import { randomBytes } from 'node:crypto';

import type { EncryptedPayload } from './types.js';

/**
 * Parses and validates the master encryption key from a hex string.
 * Throws if the key is missing, malformed, or the wrong length.
 */
export function parseMasterKey(hexKey: string | undefined): Buffer {
  if (!hexKey) {
    throw new Error(
      'MASTER_ENCRYPTION_KEY is not set. Generate one with: ' +
        'node -e "console.log(require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"',
    );
  }

  if (!/^[0-9a-f]{64}$/i.test(hexKey)) {
    throw new Error('MASTER_ENCRYPTION_KEY must be exactly 64 hex characters (256 bits).');
  }

  return Buffer.from(hexKey, 'hex');
}

/**
 * Generates a cryptographically random 256-bit key for data encryption.
 */
export function generateDek(): Buffer {
  return randomBytes(32);
}

/**
 * Generates a cryptographically random 96-bit IV for AES-256-GCM.
 * NIST recommends 96-bit (12-byte) IVs for GCM.
 */
export function generateIv(): Buffer {
  return randomBytes(12);
}

/**
 * Serializes an EncryptedPayload to a Buffer for Prisma Bytes storage.
 */
export function payloadToBuffer(payload: EncryptedPayload): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf-8');
}

/**
 * Deserializes a Buffer from Prisma Bytes storage to an EncryptedPayload.
 * Throws if the buffer does not contain a valid payload.
 */
export function bufferToPayload(buffer: Buffer): EncryptedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString('utf-8')) as unknown;
  } catch {
    throw new Error('Invalid encrypted payload: not valid JSON.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    (parsed as { version: unknown }).version !== 1
  ) {
    throw new Error('Invalid encrypted payload: unsupported version or malformed data.');
  }

  return parsed as EncryptedPayload;
}
