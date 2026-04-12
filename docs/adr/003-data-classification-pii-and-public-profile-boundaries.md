# ADR-003: Data Classification, PII, and Public/Profile Boundaries

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Use four classifications: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

## Public profile rule

Public athlete pages may expose only public-safe data such as sport, bio, verified achievements, profile photo variants, and connection count.

## Restricted data rule

Medical records, OCR outputs, doctor/clinic details, personal identification numbers, and similar PII/sensitive data are `RESTRICTED` and must never appear on public pages or in client-side decryption paths.
