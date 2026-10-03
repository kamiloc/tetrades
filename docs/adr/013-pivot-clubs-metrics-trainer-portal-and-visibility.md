# ADR-013: Pivot — Clubs, Sport Metrics, Trainer Portal, and Visibility Controls

- **Status:** Accepted
- **Date:** 2026-10-03
- **Supersedes:** [ADR-009](009-medical-ocr-state-machine-and-verification-flow.md)

## Context

The product no longer handles medical records or OCR. It now centers on club affiliation, trainer-reported sport metrics, and athlete-controlled visibility. This ADR constrains that pivot so generated code cannot drift from the intended trust boundaries. It fixes boundaries and invariants only; field-level design belongs to the openspec change that introduces each entity.

## Decision

### 1. Medical and OCR domain removed

- No medical, diagnosis, medication, doctor, clinic, or OCR concept may be added or retained in new work.
- `MedicalDocument`, `OcrJob`, the `medical` router, the `processOCR` job, their RLS policies, and their tests are removed through a dedicated change, not piecemeal.
- Identity PII (government ID, exact date of birth, contact email/phone) is unaffected. It stays L2-CONFIDENTIAL in `AthletePrivateProfile`.

### 2. New entities (names fixed, fields deferred)

`Club`, `ClubTrainer`, `ClubMembership`, `MetricDefinition`, `AthleteMetricEntry`, `AthleteMetricSummary`, `AthleteVisibilitySettings`. See `docs/erm.mmd` (marked PLANNED until they exist in `schema.prisma`).

### 3. Classification vs. visibility

- Classification (L0–L3) is storage sensitivity. Visibility is audience control, owned by the athlete via `AthleteVisibilitySettings`. Neither substitutes for the other.
- Intended classification: `Club` / `ClubMembership` mostly L0 (membership state L1), `MetricDefinition` L0 (catalog), `AthleteMetricEntry` L1, `AthleteVisibilitySettings` L1. Per-field levels are assigned when the schema is written.

### 4. Trainer trust boundary

- A trainer is a user acting through `ClubTrainer` for a specific club. There is no cross-club authority.
- Trainers NEVER read or write `AthletePrivateProfile` or any L2 field. No trainer or club role, procedure, or policy may grant this, including through break-glass in the application layer.
- A trainer may read or write an athlete's data only through an `ACTIVE` `ClubMembership` between that athlete and the trainer's club, and only the metric data in scope.

### 5. Membership requires athlete consent

- A club (or trainer) can invite an athlete, but the association becomes effective only when the athlete confirms. Until then the membership is `PENDING_ATHLETE_CONFIRMATION` and grants no read or write access.
- A pending membership must not appear on the athlete's public profile or in club rosters visible to others.
- State names are provisional until the schema is written. The invariant is not: no confirmed consent, no access.

### 6. Trainer-reported metric entries

- "Trainer-reported" is the standard term for metric entries submitted by a trainer. Do not use "coach-submitted" or similar variants.
- Writes are accepted only when the trainer's club has an `ACTIVE` `ClubMembership` with the athlete at write time.
- Every entry records the reporting trainer. Entries are attributable and never anonymous.
- `AthleteMetricSummary` is derived from entries. It is never written directly by a client.

### 7. Visibility enforcement

- Visibility is enforced in the service layer for every procedure returning athlete data, **list and detail alike**. Detail-only filtering is a defect (stranger-queries-the-unfiltered-list is the known failure mode).
- Where a table is directly readable under RLS, RLS also encodes the visibility rule; the application layer is not the only defense.
- Public SSR pages, search/directory, sitemap, and club rosters all apply visibility. A missing `AthleteVisibilitySettings` row resolves to the most restrictive setting.

## Required tests

- RLS deny-tests for `Club`, `ClubMembership`, and `AthleteMetricEntry` across tenants, using two distinct users per `AGENTS.md`.
- A test proving a trainer cannot write a metric entry for an athlete whose membership is `PENDING_ATHLETE_CONFIRMATION`.
- A test proving a trainer from club A cannot read or write for an athlete whose membership is with club B.
- A test proving trainers cannot read `AthletePrivateProfile`.
- A test proving list and detail endpoints return consistent results under identical visibility settings.

## Consequences

- Removing medical data shrinks the L2 surface to identity PII.
- The trainer portal adds a new third-party actor; the access matrix and threat model must cover it.
- Until the schema and policies exist, docs mark these entities PLANNED and code must not assume them.

## Open items

- Whether a trainer is a new `UserRole` or is derived solely from `ClubTrainer`.
- Final membership state names and transitions.
- Whether athletes can remove an `ACTIVE` membership and how that affects previously reported entries.
