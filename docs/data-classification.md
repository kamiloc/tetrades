# Data Classification

This project uses four mandatory classification levels.

## 1) PUBLIC

Data safe for public web rendering and indexing.
Examples:

- athlete display name
- sport
- public bio
- verified achievements
- public profile photo variants
- connection count

## 2) INTERNAL

Operational data not intended for public consumers.
Examples:

- request timing
- queue status metadata
- internal feature flags
- moderation metadata that is not itself sensitive

## 3) CONFIDENTIAL

Private product data requiring authenticated access and careful logging.
Examples:

- draft profile data
- private notes
- signed upload URL metadata
- non-public image originals pending processing

## 4) RESTRICTED / SENSITIVE

Highly sensitive personal data with the strongest controls.
Examples:

- medical diagnoses
- medication names
- medical test values
- personal identification numbers
- doctor names
- clinic addresses
- private medical PDFs
- OCR parsed outputs
- verified medical records

## Required handling by class

### PUBLIC

- may appear on public profile pages
- must still be shaped through public-safe schemas

### INTERNAL

- not exposed to public web
- log carefully, no secrets

### CONFIDENTIAL

- authenticated access only
- access path must be intentional
- evaluate audit needs

### RESTRICTED

- never decrypted in clients
- never placed in query params
- encrypt at rest where applicable
- access must be auditable
- no public exposure

## Checklist for new data fields

1. assign a classification
2. define the source of truth
3. define retention/deletion behavior
4. define whether encryption is required
5. define whether access must be audited
