# Spec Delta

## MODIFIED Requirements

### Requirement: Achievement reads are filtered by audience
The system SHALL return an athlete's achievements to someone other than the athlete only when the athlete's achievements audience admits that caller. `PUBLIC` admits everyone, including anonymous callers. `CONNECTIONS` admits callers with an `ACCEPTED` connection. `PRIVATE` admits no one else. Trainers get no extra access through club membership; a trainer reviewing a certification request sees only that request, as defined by achievement certification.

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

#### Scenario: Trainer with a pending request to review
- **WHEN** achievements visibility is `PRIVATE` and a trainer whose club has a `PENDING` certification request from the athlete reads the athlete's achievements
- **THEN** an empty list is returned

#### Scenario: Unknown athlete
- **WHEN** any caller reads achievements for an athlete that does not exist
- **THEN** the request fails as not found

### Requirement: Achievement reads expose only public fields
The system SHALL return, for each achievement, only its identifier, title, organization, achievement date, verification status, and certifying club, to every caller including the owner. The certifying club is the name of the club whose trainer approved it, or empty when there is none or it is hidden from the caller. It SHALL NOT return internal timestamps, verification evidence, the deciding trainer, or rejection reasons.

#### Scenario: Anonymous caller receives no internal fields
- **WHEN** an anonymous caller reads a `PUBLIC` athlete's achievements
- **THEN** each returned achievement contains no creation timestamp, verification source, athlete identifier, deciding trainer, or rejection reason

#### Scenario: Legacy verified achievement
- **WHEN** any caller reads a `VERIFIED` achievement that was verified before club certification existed
- **THEN** the achievement is returned as `VERIFIED` with no certifying club

## ADDED Requirements

### Requirement: Certifying club follows the club-memberships audience
The system SHALL show the certifying club of an achievement to someone other than the athlete only when the athlete's club-memberships audience also admits that caller. The athlete always sees it. The same rule applies to every procedure that returns achievement data.

#### Scenario: Club memberships hidden
- **WHEN** achievements visibility is `PUBLIC`, club-memberships visibility is `PRIVATE`, and a stranger reads a club-certified achievement
- **THEN** the achievement is returned as `VERIFIED` with no certifying club

#### Scenario: Club memberships visible to the caller
- **WHEN** achievements and club-memberships visibility are both `PUBLIC` and an anonymous caller reads a club-certified achievement
- **THEN** the achievement is returned with the certifying club's name

#### Scenario: Connections audience for clubs
- **WHEN** club-memberships visibility is `CONNECTIONS`
- **THEN** a caller with an `ACCEPTED` connection sees the certifying club, and a stranger sees none

#### Scenario: Owner always sees the club
- **WHEN** an athlete with `PRIVATE` club-memberships visibility reads their own achievements
- **THEN** each club-certified achievement includes the certifying club

#### Scenario: List and detail agree on the club
- **WHEN** the same caller reads an athlete's achievements through every procedure returning achievement data under identical settings
- **THEN** each procedure shows the certifying club for exactly the same achievements
