# Spec Delta

## Purpose

Gives each athlete control over which audience may see their club memberships and sport metrics, and guarantees the control is applied uniformly across every read path.

## ADDED Requirements

### Requirement: Athlete owns visibility settings
The system SHALL let an athlete read and change only their own visibility settings, with audiences `PRIVATE`, `CONNECTIONS`, and `PUBLIC` for club memberships and for metrics.

#### Scenario: Updating own settings
- **WHEN** an athlete sets metrics visibility to `CONNECTIONS`
- **THEN** the setting is stored and returned on the next read

#### Scenario: Another user's settings
- **WHEN** a different user (athlete or trainer) attempts to read or write the settings
- **THEN** the request is rejected as forbidden

### Requirement: Absence of settings means most restrictive
The system SHALL treat an athlete with no stored settings as `PRIVATE` for every audience-controlled category.

#### Scenario: New athlete
- **WHEN** a stranger reads metrics for an athlete who never configured visibility
- **THEN** no metric or membership data is returned

### Requirement: Visibility applies equally to list and detail reads
The system SHALL apply the same visibility filter to every procedure that returns athlete club or metric data, including list, search, and roster procedures, not only detail procedures.

#### Scenario: Stranger lists metrics
- **WHEN** a stranger calls a list procedure that includes an athlete with `PRIVATE` metrics
- **THEN** that athlete's metric data is absent from the result

#### Scenario: List and detail agree
- **WHEN** the same caller reads an athlete's metrics through the list and the detail procedure under identical settings
- **THEN** both return the same visible data

#### Scenario: Connections audience
- **WHEN** metrics visibility is `CONNECTIONS` and the caller has an `ACCEPTED` connection with the athlete
- **THEN** the metric data is returned; for a caller without one it is not

### Requirement: Owner and active-club access are not widened or narrowed by settings
The system SHALL always return an athlete's own data to the athlete, and SHALL return an athlete's club-scoped metric entries to trainers of a club with an `ACTIVE` membership regardless of audience settings.

#### Scenario: Athlete reads own private data
- **WHEN** an athlete with `PRIVATE` metrics reads their own metrics
- **THEN** all their entries and summaries are returned

#### Scenario: Active trainer reads club entries
- **WHEN** a trainer of an athlete's `ACTIVE` club reads that club's entries for the athlete
- **THEN** the entries are returned even if visibility is `PRIVATE`
