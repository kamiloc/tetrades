# Data Classification

This project uses four mandatory classification levels.

## 1) L0-PUBLIC

Data safe for public web rendering and indexing.
Examples:

- athlete display name
- sport
- public bio
- verified achievements
- public profile photo variants
- connection count

## 2) L1-INTERNAL

Operational data not intended for public consumers.
Examples:

- request timing
- queue status metadata
- internal feature flags
- moderation metadata that is not itself sensitive

## 3) L2-CONFIDENTIAL

Private product data requiring authenticated access and careful logging.
Examples:

- medical diagnoses
- medication names
- medical test values
- personal identification numbers
- doctor names
- clinic addresses
- private medical PDFs
- OCR raw/parsed outputs
- verified medical records
- private profile fields (contact email, phone, government ID)

## 4) L3-RESTRICTED

Highly sensitive personal data with the strongest controls.
Examples:

- master encryption keys
- Supabase service-role keys
- Anthropic API keys

## Required handling by class

### L0-PUBLIC

- may appear on public profile pages
- must still be shaped through public-safe schemas

### L1-INTERNAL

- not exposed to public web
- log carefully, no secrets

### L2-CONFIDENTIAL

- authenticated access only
- access path must be intentional
- encrypt at rest
- access must be auditable

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
