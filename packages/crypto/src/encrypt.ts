import { createCipheriv } from 'node:crypto';

import { generateDek, generateIv, parseMasterKey, payloadToBuffer } from './helpers.js';
import type { EncryptedPayload } from './types.js';

/**
 * Encrypts a plaintext string using AES-256-GCM envelope encryption.
 *
 * Generates a random Data Encryption Key (DEK) for this operation, encrypts
 * the plaintext with the DEK, then wraps the DEK with the master key. Returns
 * a Buffer containing the full encrypted payload for Prisma Bytes storage.
 *
 * For JSON data, stringify first: encryptPII(JSON.stringify(obj), masterKeyHex)
 *
 * @param plaintext - The string to encrypt. For JSON, pass JSON.stringify(data).
 * @param masterKeyHex - The master key as a 64-character hex string.
 * @returns Buffer ready for Prisma Bytes storage.
 */
export function encryptPII(plaintext: string, masterKeyHex: string): Buffer {
  const masterKey = parseMasterKey(masterKeyHex);

  // 1. Generate a random DEK for this record
  const dek = generateDek();

  // 2. Encrypt the plaintext with the DEK
  const dataIv = generateIv();
  const dataCipher = createCipheriv('aes-256-gcm', dek, dataIv);
  const encrypted = Buffer.concat([dataCipher.update(plaintext, 'utf-8'), dataCipher.final()]);
  const dataAuthTag = dataCipher.getAuthTag();

  // 3. Wrap the DEK with the master key
  const dekIv = generateIv();
  const dekCipher = createCipheriv('aes-256-gcm', masterKey, dekIv);
  const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekAuthTag = dekCipher.getAuthTag();

  // 4. Zero out the plaintext DEK from memory
  dek.fill(0);

  // 5. Build the payload
  const payload: EncryptedPayload = {
    version: 1,
    iv: dataIv.toString('base64'),
    authTag: dataAuthTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    wrappedDek: wrappedDek.toString('base64'),
    dekIv: dekIv.toString('base64'),
    dekAuthTag: dekAuthTag.toString('base64'),
  };

  return payloadToBuffer(payload);
}
