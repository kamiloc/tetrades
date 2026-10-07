# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Absence of settings means most restrictive`
- TO: `### Requirement: Absence of settings means the category default`

## MODIFIED Requirements

### Requirement: Athlete owns visibility settings
The system SHALL let an athlete read and change only their own visibility settings, with audiences `PRIVATE`, `CONNECTIONS`, and `PUBLIC` for club memberships, for metrics, and for achievements.

#### Scenario: Updating own settings
- **WHEN** an athlete sets metrics visibility to `CONNECTIONS`
- **THEN** the setting is stored and returned on the next read

#### Scenario: Updating achievements visibility
- **WHEN** an athlete sets achievements visibility to `PRIVATE`
- **THEN** the setting is stored and returned on the next read, and the other categories are unchanged

#### Scenario: Another user's settings
- **WHEN** a different user (athlete or trainer) attempts to read or write the settings
- **THEN** the request is rejected as forbidden

### Requirement: Absence of settings means the category default
The system SHALL treat an athlete with no stored setting for a category as having that category's default audience: `PRIVATE` for club memberships and metrics, and `PUBLIC` for achievements.

#### Scenario: New athlete
- **WHEN** a stranger reads metrics for an athlete who never configured visibility
- **THEN** no metric or membership data is returned

#### Scenario: New athlete's achievements
- **WHEN** a stranger or an anonymous caller reads achievements for an athlete who never configured visibility
- **THEN** the athlete's `VERIFIED` achievements are returned

#### Scenario: Reading defaults
- **WHEN** an athlete who never configured visibility reads their settings
- **THEN** club memberships and metrics are reported as `PRIVATE` and achievements as `PUBLIC`

### Requirement: Visibility applies equally to list and detail reads
The system SHALL apply the same visibility filter to every procedure that returns athlete club, metric, or achievement data, including list, search, and roster procedures, not only detail procedures.

#### Scenario: Stranger lists metrics
- **WHEN** a stranger calls a list procedure that includes an athlete with `PRIVATE` metrics
- **THEN** that athlete's metric data is absent from the result

#### Scenario: List and detail agree
- **WHEN** the same caller reads an athlete's metrics through the list and the detail procedure under identical settings
- **THEN** both return the same visible data

#### Scenario: Connections audience
- **WHEN** metrics visibility is `CONNECTIONS` and the caller has an `ACCEPTED` connection with the athlete
- **THEN** the metric data is returned; for a caller without one it is not

#### Scenario: Achievement reads agree with the audience rule
- **WHEN** any caller (anonymous, stranger, connection, or owner) reads an athlete's achievements under each of the three audiences
- **THEN** every procedure returning achievement data returns achievements exactly when the audience admits that caller, and returns the same achievements

## ADDED Requirements

### Requirement: Achievement reads are filtered by audience
The system SHALL return an athlete's achievements to someone other than the athlete only when the athlete's achievements audience admits that caller. `PUBLIC` admits everyone, including anonymous callers. `CONNECTIONS` admits callers with an `ACCEPTED` connection. `PRIVATE` admits no one else. Trainers get no extra access through club membership.

#### Scenario: Private achievements
- **WHEN** achievements visibility is `PRIVATE` and a connected athlete, a stranger, or an anonymous caller reads the athlete's achievements
- **THEN** an empty list is returned

#### Scenario: Connections-only achievements
- **WHEN** achievements visibility is `CONNECTIONS`
- **THEN** a caller with an `ACCEPTED` connection receives the athlete's `VERIFIED` achievements, and a stranger or anonymous caller receives an empty list

#### Scenario: Public achievements to an anonymous caller
- **WHEN** achievements visibility is `PUBLIC` and an anonymous caller reads the athlete's achievements
- **THEN** the athlete's `VERIFIED` achievements are returned

#### Scenario: Active-club trainer
- **WHEN** achievements visibility is `PRIVATE` and a trainer of a club with an `ACTIVE` membership with the athlete reads the athlete's achievements
- **THEN** an empty list is returned

#### Scenario: Unknown athlete
- **WHEN** any caller reads achievements for an athlete that does not exist
- **THEN** the request fails as not found

### Requirement: Only verified achievements are shown to others
The system SHALL return only `VERIFIED` achievements to callers other than the athlete, whatever the audience, and SHALL always return all of an athlete's achievements, in every verification status, to the athlete.

#### Scenario: Unverified achievement under a public audience
- **WHEN** achievements visibility is `PUBLIC` and a stranger reads an athlete who has `VERIFIED` and `PENDING` achievements
- **THEN** only the `VERIFIED` achievements are returned

#### Scenario: Owner reads own private achievements
- **WHEN** an athlete with `PRIVATE` achievements reads their own achievements
- **THEN** all of their achievements are returned in every verification status

### Requirement: Achievement reads expose only public fields
The system SHALL return, for each achievement, only its identifier, title, organization, achievement date, and verification status, to every caller including the owner. It SHALL NOT return internal timestamps or verification evidence.

#### Scenario: Anonymous caller receives no internal fields
- **WHEN** an anonymous caller reads a `PUBLIC` athlete's achievements
- **THEN** each returned achievement contains no creation timestamp, verification source, or athlete identifier
