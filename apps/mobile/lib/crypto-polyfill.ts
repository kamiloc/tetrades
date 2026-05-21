// Polyfill WebCrypto for React Native so Supabase PKCE works end-to-end:
//   - `crypto.getRandomValues` (used to generate the PKCE code_verifier)
//     → `react-native-get-random-values` patches it onto globalThis.crypto.
//   - `crypto.subtle.digest('SHA-256', ...)` (used to derive code_challenge)
//     → polyfilled below using expo-crypto's native digest.
//
// Without these, supabase-js either throws or silently downgrades to
// `code_challenge_method=plain`. Must be imported BEFORE any module that
// constructs the Supabase client.

import 'react-native-get-random-values';

import * as ExpoCrypto from 'expo-crypto';

const ALGO_MAP: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
  'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
};

type DigestAlgorithm = string | { name: string };
type BufferLike = ArrayBuffer | ArrayBufferView;

async function digest(algorithm: DigestAlgorithm, data: BufferLike): Promise<ArrayBuffer> {
  const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
  const mapped = ALGO_MAP[name.toUpperCase()];
  if (!mapped) {
    throw new Error(`crypto.subtle.digest: unsupported algorithm "${name}"`);
  }
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return ExpoCrypto.digest(mapped, bytes);
}

interface CryptoLike {
  subtle?: { digest: typeof digest };
}

const g = globalThis as unknown as { crypto?: CryptoLike };

if (!g.crypto) {
  g.crypto = {};
}

if (!g.crypto.subtle) {
  Object.defineProperty(g.crypto, 'subtle', {
    value: { digest },
    writable: false,
    configurable: false,
  });
}
