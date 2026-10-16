# trainer-access-boundary Specification

## Purpose

Fixes the limits of trainer access so that club roles can never reach identity PII or data outside an athlete-confirmed membership.

## Requirements

### Requirement: Trainers never access private profile data
The system SHALL deny every trainer read or write of an athlete's private profile and any L2-CONFIDENTIAL field, in every membership state.

#### Scenario: Active membership
- **WHEN** a trainer whose club has an `ACTIVE` membership with the athlete requests the athlete's private profile
- **THEN** the request is denied at both the API and the database layers

#### Scenario: No membership
- **WHEN** a trainer with no membership to the athlete requests the private profile
- **THEN** the request is denied

### Requirement: Trainer role is derived from club trainer records
The system SHALL treat a user as a trainer of a club only if a `ClubTrainer` record links the user to that club, and SHALL NOT introduce a global trainer role.

#### Scenario: User without records
- **WHEN** a user with no `ClubTrainer` record calls a trainer-only procedure
- **THEN** the request is rejected as forbidden

#### Scenario: Cross-club authority
- **WHEN** a trainer of club A acts on a membership or entry belonging to club B
- **THEN** the request is rejected as forbidden

### Requirement: Trainers read only club-scoped data
The system SHALL limit a trainer's athlete reads to memberships and metric entries of the trainer's own club with `ACTIVE` status, and to achievement certification requests made to the trainer's own club while they are `PENDING`.

#### Scenario: Roster
- **WHEN** a trainer lists athletes of their club
- **THEN** only athletes with `ACTIVE` memberships are returned with club-scoped data; pending invitees appear only as invitations the trainer sent, without athlete profile details beyond L0 identity

#### Scenario: After leaving
- **WHEN** an athlete's membership becomes `COMPLETED`
- **THEN** the club's trainers can no longer read that athlete's entries through the club

#### Scenario: Pending certification request
- **WHEN** an athlete requests certification of an achievement from the trainer's club
- **THEN** the trainer can read that request's achievement title, organization, and date and the athlete's L0 identity, and nothing else about the athlete's achievements

#### Scenario: Decided certification request
- **WHEN** a certification request made to the trainer's club is approved, rejected, or cancelled
- **THEN** the trainer can no longer read it through the club

#### Scenario: Request made to another club
- **WHEN** a trainer of club A attempts to read a certification request made to club B
- **THEN** the request is denied at both the API and the database layers
