# ADR-010: Background Jobs, Storage, and Image Processing

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision
Long-running work, external provider calls, storage-triggered processing, and image optimization belong in BullMQ jobs.

## Rules
- define payload types in `packages/queue/src/types.ts`
- payloads must be serializable
- jobs need retries, exponential backoff, and recoverable-state transitions
- persist DB state before enqueueing
- signed URLs are generated server-side via `storageRouter`
- Fastify never handles multipart uploads
- use `sharp` only
- generate 150/400/1200 WebP profile variants exactly
