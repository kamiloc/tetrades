# sport-metrics Specification

## Purpose

Provides a catalog of sport metrics and attributable, trainer-reported entries for athletes, with summaries derived from those entries.

## Requirements

### Requirement: Metric catalog is public reference data
The system SHALL maintain a catalog of metric definitions readable by any authenticated or anonymous caller and writable only through service-role access.

#### Scenario: Reading the catalog
- **WHEN** any caller lists metric definitions
- **THEN** active definitions are returned with no athlete data

#### Scenario: Writing the catalog from the API
- **WHEN** an authenticated user attempts to create or edit a metric definition through the API
- **THEN** no such operation is available

### Requirement: Entries require an active membership
The system SHALL accept a trainer-reported metric entry only when the trainer belongs to a club that has an `ACTIVE` membership with the athlete at write time.

#### Scenario: Active membership
- **WHEN** a trainer of club A reports an entry for an athlete with an `ACTIVE` membership with club A
- **THEN** the entry is stored with the reporting trainer and the authorizing membership recorded

#### Scenario: Pending membership
- **WHEN** a trainer reports an entry for an athlete whose membership is `PENDING_ATHLETE_CONFIRMATION`
- **THEN** the request is rejected as forbidden and nothing is stored

#### Scenario: Ended or rejected membership
- **WHEN** a trainer reports an entry for an athlete whose membership is `COMPLETED` or `REJECTED`
- **THEN** the request is rejected as forbidden and nothing is stored

#### Scenario: Another club's athlete
- **WHEN** a trainer of club A reports an entry for an athlete whose only active membership is with club B
- **THEN** the request is rejected as forbidden and nothing is stored

### Requirement: Entries are attributable and append-only
The system SHALL record the reporting trainer on every entry and SHALL NOT allow entries to be edited or deleted through the API.

#### Scenario: Attribution
- **WHEN** an entry is stored
- **THEN** reading it shows which club trainer reported it

#### Scenario: Editing an entry
- **WHEN** any user attempts to update or delete an existing entry through the API
- **THEN** no such operation is available

### Requirement: Summaries are derived
The system SHALL maintain an athlete metric summary per athlete and metric derived from entries, and SHALL NOT let clients write summaries.

#### Scenario: Summary after new entry
- **WHEN** a valid entry is stored
- **THEN** the athlete's summary for that metric reflects the new latest value and increased entry count in the same transaction

#### Scenario: Client writes a summary
- **WHEN** any client attempts to create or modify a summary directly
- **THEN** no such operation is available and database writes by non-service roles are denied
