# Spec Delta

## Purpose

Lets platform admins create and maintain clubs and take them out of service without deleting them, so that a club's history stays intact while its trainers lose access.

## ADDED Requirements

### Requirement: Admins create clubs
The system SHALL let an admin create a club with a name, slug, country, and optional city. A new club is active.

#### Scenario: Create a club
- **WHEN** an admin creates a club with a valid name, unused slug, and country
- **THEN** the club exists and is active

#### Scenario: Slug already used
- **WHEN** an admin creates a club with a slug that another club already uses, active or not
- **THEN** the request is rejected as a conflict and no club is created

#### Scenario: Invalid input
- **WHEN** an admin creates a club with a missing name or an invalid slug or country
- **THEN** the request is rejected as invalid and no club is created

### Requirement: Admins edit club details but not the slug
The system SHALL let an admin change a club's name, country, and city. The system SHALL NOT allow a club's slug to change after creation.

#### Scenario: Edit details
- **WHEN** an admin changes a club's name and city
- **THEN** the club shows the new name and city and keeps its slug

#### Scenario: Slug change attempt
- **WHEN** an admin attempts to change a club's slug
- **THEN** the slug is unchanged

#### Scenario: Unknown club
- **WHEN** an admin edits a club that does not exist
- **THEN** the request fails as not found

### Requirement: Clubs are never deleted
The system SHALL NOT provide any way to delete a club. Taking a club out of service is done only by deactivating it.

#### Scenario: Delete attempt
- **WHEN** an admin looks for a way to delete a club
- **THEN** only deactivation is offered and the club row remains

### Requirement: Admins list clubs
The system SHALL let an admin list clubs, newest first, with cursor pagination (default 20, maximum 50), optionally filtered to active or deactivated clubs. Each entry includes whether the club is active and its count of active trainers.

#### Scenario: Filter to deactivated clubs
- **WHEN** an admin lists clubs filtered to deactivated
- **THEN** only deactivated clubs are returned

#### Scenario: Page size limit
- **WHEN** an admin requests more than 50 clubs in one page
- **THEN** the request is rejected as invalid

### Requirement: Deactivation takes a club out of service
The system SHALL let an admin deactivate an active club. While deactivated, the club's trainers have no trainer access, and the club accepts no new athlete invitations, trainer invitations, or certification requests.

#### Scenario: Trainer of a deactivated club
- **WHEN** a trainer of a deactivated club calls any trainer-only procedure for that club
- **THEN** the request is rejected as forbidden

#### Scenario: Deactivate an already deactivated club
- **WHEN** an admin deactivates a club that is already deactivated
- **THEN** the request is rejected as invalid and nothing changes

### Requirement: Deactivation closes the club's open items at once
The system SHALL, in the same operation that deactivates a club, cancel the club's `PENDING` certification requests (their achievements return to `UNVERIFIED`), move its `PENDING_ATHLETE_CONFIRMATION` memberships to `REJECTED`, and revoke its `PENDING` trainer invitations. If any step fails, nothing changes.

#### Scenario: Club with open items
- **WHEN** an admin deactivates a club that has a pending certification request, a pending athlete invitation, and a pending trainer invitation
- **THEN** the request is `CANCELLED` and its achievement `UNVERIFIED`, the membership is `REJECTED`, the trainer invitation is `REVOKED`, and the club is deactivated

### Requirement: Deactivation preserves history
The system SHALL keep a deactivated club's `ACTIVE` memberships `ACTIVE`, and SHALL keep its metric entries, certified achievements, and trainer records unchanged.

#### Scenario: Active member of a deactivated club
- **WHEN** a club with an `ACTIVE` membership is deactivated
- **THEN** the membership is still `ACTIVE`, the athlete can still leave it, and the club's trainers cannot act on it

#### Scenario: Certified achievement
- **WHEN** a club that certified an athlete's achievement is deactivated
- **THEN** the achievement stays `VERIFIED` with the same certifying club

### Requirement: Admins reactivate clubs
The system SHALL let an admin reactivate a deactivated club, restoring access for its non-revoked trainers. Items cancelled, rejected, or revoked by the deactivation SHALL stay in those states.

#### Scenario: Reactivate
- **WHEN** an admin reactivates a deactivated club
- **THEN** the club is active, its non-revoked trainers can use trainer procedures again, and previously cancelled requests remain `CANCELLED`

#### Scenario: Reactivate an active club
- **WHEN** an admin reactivates a club that is already active
- **THEN** the request is rejected as invalid and nothing changes

### Requirement: Club outputs show whether the club is active
The system SHALL include an active/inactive indicator with every club returned to any caller, and SHALL NOT expose the deactivation timestamp or the creation timestamp outside admin procedures, through the API or through direct database reads.

#### Scenario: Direct database read
- **WHEN** an anonymous or authenticated client reads clubs directly from the database
- **THEN** it can read the club's public fields but not its deactivation or creation timestamp

#### Scenario: Athlete reads their memberships
- **WHEN** an athlete lists their memberships and one club is deactivated
- **THEN** that club is returned marked inactive

#### Scenario: Visibility unchanged
- **WHEN** another user views an athlete's club history that includes a deactivated club
- **THEN** the club appears only if the athlete's club-memberships audience admits that user, marked inactive
