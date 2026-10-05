# Spec Delta

## Purpose

Lets an athlete have all of their data deleted, in line with Habeas Data, while respecting legal holds and proving that nothing was left behind.

## ADDED Requirements

### Requirement: Athlete can request deletion of their data
The system SHALL let an authenticated athlete request deletion of their own data, recording the request and processing it in the background.

#### Scenario: Request accepted
- **WHEN** an authenticated athlete requests deletion
- **THEN** a deletion request is recorded as `REQUESTED` for that athlete and a deletion job is enqueued after the record is persisted

#### Scenario: Another athlete's data
- **WHEN** a user requests deletion for a different athlete
- **THEN** the request is rejected as forbidden

### Requirement: Deletion is blocked by a legal hold
The system SHALL NOT delete any data of an athlete under legal hold and SHALL mark the request `BLOCKED_LEGAL_HOLD`.

#### Scenario: Athlete under hold
- **WHEN** the deletion job runs for an athlete whose legal-hold flag is set
- **THEN** no data is deleted, a warning is logged ("Deletion blocked by legal hold"), and the request status is `BLOCKED_LEGAL_HOLD`

### Requirement: Deletion covers every athlete-owned record
The system SHALL delete the athlete's rows in every table that references the athlete, including club memberships, metric entries, metric summaries, and visibility settings, and all Storage files under the athlete's prefix.

#### Scenario: Complete deletion
- **WHEN** the deletion job runs for an athlete with data in every table and a profile photo
- **THEN** afterward no row references the athlete in any table and no Storage object exists under the athlete's prefix

#### Scenario: Records reported by trainers
- **WHEN** an athlete with entries reported by trainers is deleted
- **THEN** those entries are deleted with the athlete and the trainers' own records are unaffected

### Requirement: Deletion is verified
The system SHALL run a verification after deletion and SHALL NOT mark the request `COMPLETED` unless verification finds nothing remaining.

#### Scenario: Verification passes
- **WHEN** verification finds zero residual rows and files
- **THEN** the request status becomes `COMPLETED`

#### Scenario: Verification fails
- **WHEN** verification finds residual rows or files
- **THEN** the request status becomes `FAILED` and an error is logged with the request id for the project owner to act on
