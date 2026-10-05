# club-membership Specification

## Purpose

Lets athletes belong to clubs only with their own consent, through an explicit membership lifecycle that determines whether the club's trainers have any access.

## Requirements

### Requirement: Membership starts as an invitation
The system SHALL allow a trainer to invite an athlete to the trainer's own club, creating a membership in `PENDING_ATHLETE_CONFIRMATION`.

#### Scenario: Trainer invites athlete
- **WHEN** a trainer of club A invites an athlete who has no open membership with club A
- **THEN** a membership for that athlete and club A exists with status `PENDING_ATHLETE_CONFIRMATION`

#### Scenario: Trainer invites for another club
- **WHEN** a trainer of club A attempts to invite an athlete to club B
- **THEN** the request is rejected as forbidden and no membership is created

#### Scenario: Duplicate open membership
- **WHEN** an invitation is sent for an athlete who already has a `PENDING_ATHLETE_CONFIRMATION` or `ACTIVE` membership with the same club
- **THEN** the request is rejected and no second membership is created

### Requirement: Only the athlete can accept or reject an invitation
The system SHALL activate a membership only when the invited athlete confirms it, and SHALL move it to `REJECTED` when the athlete declines.

#### Scenario: Athlete accepts
- **WHEN** the invited athlete accepts a `PENDING_ATHLETE_CONFIRMATION` membership
- **THEN** the status becomes `ACTIVE`

#### Scenario: Athlete rejects
- **WHEN** the invited athlete rejects a `PENDING_ATHLETE_CONFIRMATION` membership
- **THEN** the status becomes `REJECTED`

#### Scenario: Someone else responds
- **WHEN** a trainer or a different athlete attempts to accept or reject the invitation
- **THEN** the request is rejected as forbidden and the status is unchanged

### Requirement: Membership transitions are restricted
The system SHALL allow only `PENDING_ATHLETE_CONFIRMATION → ACTIVE`, `PENDING_ATHLETE_CONFIRMATION → REJECTED`, and `ACTIVE → COMPLETED`; `COMPLETED` and `REJECTED` are terminal.

#### Scenario: Athlete leaves the club
- **WHEN** an athlete ends an `ACTIVE` membership
- **THEN** the status becomes `COMPLETED`

#### Scenario: Reopening a terminal membership
- **WHEN** any transition is attempted from `COMPLETED` or `REJECTED`
- **THEN** the request is rejected and the status is unchanged

#### Scenario: Re-invitation after a terminal state
- **WHEN** a trainer invites an athlete whose previous membership with the club is `COMPLETED` or `REJECTED`
- **THEN** a new membership is created in `PENDING_ATHLETE_CONFIRMATION` and the earlier record is unchanged

### Requirement: Non-active memberships are not publicly associated
The system SHALL NOT show `PENDING_ATHLETE_CONFIRMATION` or `REJECTED` memberships on any athlete profile or club roster visible to others.

#### Scenario: Pending invitation hidden
- **WHEN** another user views an athlete who has only a pending invitation
- **THEN** the athlete shows no association with the inviting club
