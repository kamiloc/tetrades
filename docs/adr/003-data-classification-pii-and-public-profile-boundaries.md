# ADR-003: Data Classification, PII, and Public/Profile Boundaries

- **Status:** Accepted
- **Date:** 2026-04-02

## Decision

Use four classifications aligned to the schema and repo constitution: `L0-PUBLIC`, `L1-INTERNAL`, `L2-CONFIDENTIAL`, `L3-RESTRICTED`.

## Public profile rule

Public athlete pages may expose only public-safe data such as sport, bio, verified achievements, profile photo variants, and connection count, as further limited by the athlete's visibility settings.

## Restricted data rule

Government ID, exact date of birth, contact email/phone, and similar identity PII are `L2-CONFIDENTIAL` and must never appear on public pages or in client-side decryption paths. `L3-RESTRICTED` is reserved for master keys, service-role keys, and other secret material that never appears in application data models.

## Classification vs. visibility

Classification (L0–L3) describes storage sensitivity. Visibility is a separate, athlete-controlled audience setting introduced by [ADR-013](013-pivot-clubs-metrics-trainer-portal-and-visibility.md). Neither substitutes for the other.
