# ADR-003: Data Classification, PII, and Public/Profile Boundaries

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Use four classifications aligned to the schema and repo constitution: `L0-PUBLIC`, `L1-INTERNAL`, `L2-CONFIDENTIAL`, `L3-RESTRICTED`.

## Public profile rule

Public athlete pages may expose only public-safe data such as sport, bio, verified achievements, profile photo variants, and connection count.

## Restricted data rule

Medical records, OCR outputs, doctor/clinic details, personal identification numbers, and similar PII/sensitive data are `L2-CONFIDENTIAL` and must never appear on public pages or in client-side decryption paths. `L3-RESTRICTED` is reserved for master keys, service-role keys, and other secret material that never appears in application data models.
