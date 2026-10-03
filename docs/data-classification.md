# Data Classification

This project uses four mandatory classification levels. Every field in every model has exactly one; when in doubt, classify up.

> **Classification is not visibility.** Classification (L0–L3) describes how sensitive stored data is and how it must be stored, logged, and accessed. Visibility describes which audience an athlete has allowed to see a field they own (`AthleteVisibilitySettings`, [ADR-013](adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md)). An L1 field can be shown to a chosen audience, and an L0 field is not automatically shown to everyone. Neither replaces the other.

Entries marked **(planned)** describe pivot entities that are not yet in `prisma/schema.prisma`. Per-field levels are assigned when each entity is defined in the schema.

## 1) L0-PUBLIC

Data safe for public web rendering and indexing, subject to the athlete's visibility settings.
Examples:

- athlete display name
- sport
- public bio, city, position, height, weight
- verified achievements
- public profile photo variants
- connection count
- club names and club-level public information (planned)
- metric catalog: `MetricDefinition` (planned)

## 2) L1-INTERNAL

Operational data not intended for public consumers.
Examples:

- email address, account timestamps, device tokens
- queue status metadata and request ids
- profile photo originals (EXIF may contain GPS and device info)
- consent, audit, and data-lifecycle records
- club membership state (planned)
- athlete metric entries and summaries: `AthleteMetricEntry`, `AthleteMetricSummary` (planned). Not inherently sensitive; exposure is controlled by visibility rules, not by classification.
- visibility preferences: `AthleteVisibilitySettings` (planned)

## 3) L2-CONFIDENTIAL

Identity PII requiring authenticated owner-only access and careful logging.
Examples:

- government identification number
- exact date of birth
- contact email and phone

These live in `AthletePrivateProfile` as `*_enc` columns. Trainers and clubs never have access to them.

## 4) L3-RESTRICTED

Secrets with the strongest controls.
Examples:

- master encryption keys
- Supabase service-role keys
- third-party API keys

## Required handling by class

### L0-PUBLIC

- may appear on public profile pages once visibility allows
- must still be shaped through public-safe schemas

### L1-INTERNAL

- not exposed to the public web by default
- may appear in structured logs, never in error messages returned to clients
- exposure to other users (for example a trainer or club) requires an explicit rule, such as an `ACTIVE` membership

### L2-CONFIDENTIAL

- authenticated owner-only access; no role grants cross-tenant access
- encrypted at rest via `@packages/crypto`
- never logged; every decryption is audited

### L3-RESTRICTED

- never present in application data models
- never logged or returned to clients
- stored only in environment or secret managers

## Checklist for new data fields

1. assign a classification
2. define the source of truth
3. define retention/deletion behavior
4. define whether encryption is required
5. define whether access must be audited
6. define which audiences may see it and where that is enforced (visibility rule, list and detail endpoints, RLS)
