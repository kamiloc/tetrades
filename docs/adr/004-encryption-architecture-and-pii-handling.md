# ADR-004: Encryption Architecture and PII Handling

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

All repository crypto flows are isolated in `packages/crypto`, which exports exactly `encryptPII()` and `decryptPII()`.

## Rules

- use `node:crypto` AES-256-GCM only
- do not add third-party crypto libraries
- never store keys in source, examples, seeds, or fixtures
- never log plaintext/ciphertext/keys
- never place PII in query strings
- decryption is server-only and should emit audit events

## Consequences

A tiny crypto surface area reduces AI misuse and makes reviews simpler.
