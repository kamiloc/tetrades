# Spec Delta

## Purpose

Defines the trainer-only reads a trainer workspace needs: which clubs the caller trains, one athlete of a club's roster, and the public identity of an athlete to invite. Each read stays inside the trainer access boundary.

## ADDED Requirements

### Requirement: A user lists the clubs they train
The system SHALL return to a signed-in user only their own non-revoked trainer assignments at active clubs, paginated. Each item SHALL carry the club in the existing public club shape (`id`, `slug`, `name`, `countryCode`, `city`, `isActive`). A user with no assignment, including athletes and admins, SHALL get an empty list.

#### Scenario: Trainer of two clubs
- **WHEN** a user with non-revoked trainer assignments at two active clubs lists their trainer clubs
- **THEN** both clubs are returned, each with `id`, `slug`, `name`, `countryCode`, `city` and `isActive`

#### Scenario: Revoked or deactivated
- **WHEN** a user's only assignment is revoked, or its club is deactivated
- **THEN** that club is not returned

#### Scenario: Not a trainer
- **WHEN** an athlete or an admin with no trainer assignment lists their trainer clubs
- **THEN** an empty list is returned

#### Scenario: Signed out
- **WHEN** a caller without a session lists trainer clubs
- **THEN** the request is rejected as unauthorized

#### Scenario: Other users' assignments
- **WHEN** any user lists their trainer clubs
- **THEN** no other user's assignment, trainer record id, user id or email appears in the result

### Requirement: Roster rows include the athlete's sport
Each roster row SHALL include the athlete's sport (`id` and `name`) alongside the athlete's `id`, `slug` and `displayName`, and no other athlete field.

#### Scenario: Roster row
- **WHEN** a trainer lists their club's roster
- **THEN** each row carries the athlete's `id`, `slug`, `displayName` and `sport`, and no private or L2 field

#### Scenario: No other club's membership
- **WHEN** a roster athlete also has a membership with another club, whatever their club-membership visibility setting
- **THEN** no roster row names, identifies or counts that other membership

### Requirement: A trainer opens one roster athlete
The system SHALL return one athlete of the trainer's club, in the same shape and under the same filter as a roster row: an `ACTIVE` membership with the club, or a pending invitation sent by this trainer. Any other athlete SHALL be answered as not found.

#### Scenario: Active member
- **WHEN** a trainer of club A opens an athlete with an `ACTIVE` membership with club A
- **THEN** the athlete's roster row is returned with status `ACTIVE`

#### Scenario: Own pending invitation
- **WHEN** a trainer opens an athlete they invited to club A who hasn't answered yet
- **THEN** the row is returned with status `PENDING_ATHLETE_CONFIRMATION`

#### Scenario: Not on the roster
- **WHEN** a trainer opens an athlete who has no membership with club A, whose membership ended or was rejected, or who was invited by another trainer and hasn't answered
- **THEN** the request is answered as not found

#### Scenario: Another club
- **WHEN** a trainer of club A opens an athlete for club B
- **THEN** the request is rejected as forbidden

#### Scenario: No other club's membership
- **WHEN** the athlete also has a membership with another club
- **THEN** the response does not name, identify or count it

### Requirement: A trainer looks up an athlete to invite
The system SHALL let a trainer of a club look up athletes to invite, either by name among searchable athletes or by exact `slug` among all athletes, searchable or not. Both forms SHALL return only athletes whose profile status is `ACTIVE`. Each result SHALL contain only the athlete's `id`, `slug`, `displayName` and `sport`, plus whether the athlete is already an active member of this club or has a pending invitation from this trainer.

#### Scenario: Search by name
- **WHEN** a trainer searches with at least two characters of a name
- **THEN** matching searchable athletes with an `ACTIVE` profile are returned, case-insensitively, paginated and ordered by name

#### Scenario: Non-searchable athlete by name
- **WHEN** a trainer searches by name for an athlete who isn't searchable
- **THEN** that athlete is not returned

#### Scenario: Non-searchable athlete by exact slug
- **WHEN** a trainer looks up the exact `slug` of an athlete who isn't searchable and whose profile is `ACTIVE`
- **THEN** that one athlete is returned

#### Scenario: Profile not active
- **WHEN** a trainer looks up, by name or by exact `slug`, an athlete whose profile status is `DRAFT`, `HIDDEN` or `LOCKED`
- **THEN** that athlete is not returned

#### Scenario: Unknown slug
- **WHEN** a trainer looks up a `slug` that matches no athlete
- **THEN** an empty result is returned

#### Scenario: Already related
- **WHEN** a result is already an active member of this club, or has a pending invitation from this trainer
- **THEN** the result says so

#### Scenario: Pending invitation from another trainer
- **WHEN** a result has a pending invitation to the club from a different trainer
- **THEN** the result does not reveal it, and inviting the athlete is answered with a conflict

#### Scenario: Memberships with other clubs
- **WHEN** a result has an active or pending membership with another club, whatever their club-membership visibility setting
- **THEN** the result does not name, identify or count it, and its relation reflects only this club

#### Scenario: Nothing beyond public identity
- **WHEN** any result is returned
- **THEN** it contains no bio, measurements, metrics, achievements, email or L2 field

#### Scenario: Not a trainer of the club
- **WHEN** a user who isn't a non-revoked trainer of an active club looks up athletes for that club
- **THEN** the request is rejected as forbidden
