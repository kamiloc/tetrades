# Spec Delta

## Purpose

Defines the admin-only reads that give a platform admin a view across clubs: overview counts, the trainer directory, and the admin action log. Each read stays within admin authority over clubs and trainer access.

## ADDED Requirements

### Requirement: Admins read platform overview counts
The system SHALL give an admin these counts:
- active clubs
- deactivated clubs
- active clubs with no active trainer
- active trainer assignments (non-revoked, at active clubs)
- pending trainer invitations that haven't expired
- pending trainer invitations expiring within 48 hours

All six counts SHALL be read from one consistent database snapshot taken during the request, and the response SHALL say when it was generated. It SHALL return no athlete count or athlete data.

#### Scenario: Counts
- **WHEN** an admin reads the overview with no concurrent writes
- **THEN** each count matches the clubs, trainer assignments and invitations in the database

#### Scenario: Consistent under concurrent writes
- **WHEN** a club is deactivated or reactivated while an admin reads the overview
- **THEN** the counts all reflect the same snapshot, either all before or all after the change; for example, active plus deactivated clubs always equals the total number of clubs in that snapshot

#### Scenario: Snapshot time
- **WHEN** an admin reads the overview
- **THEN** the response includes the time it was generated

#### Scenario: Revoked and expired are not counted
- **WHEN** a trainer assignment is revoked, or an invitation has passed its expiry
- **THEN** it is not counted as active or pending

#### Scenario: Not an admin
- **WHEN** a non-admin reads the overview
- **THEN** the request is rejected as forbidden

#### Scenario: Signed out
- **WHEN** a caller without a session reads the overview
- **THEN** the request is rejected as unauthorized

### Requirement: Admins list trainers across clubs
The system SHALL let an admin list trainer assignments across all clubs, newest first, with cursor pagination (default 20, maximum 50). Each entry SHALL carry an access state derived from ADR-017:
- `ACTIVE`: not revoked, at an active club
- `CLUB_DEACTIVATED`: not revoked, at a deactivated club, so the trainer has no access
- `REVOKED`

The list SHALL be optionally filtered by access state or all, and by a club name search of at least two characters. Each entry SHALL also carry the assignment's id and dates; its club's `id`, `slug`, `name` and `isActive`; and the invited email of the latest accepted invitation for that assignment, or null.

#### Scenario: All clubs
- **WHEN** an admin lists trainers with no filter
- **THEN** assignments from every club are returned, newest first

#### Scenario: Filter by access
- **WHEN** an admin lists trainers filtered to revoked
- **THEN** only revoked assignments are returned

#### Scenario: Assignment at a deactivated club
- **WHEN** a non-revoked assignment belongs to a deactivated club
- **THEN** its access state is `CLUB_DEACTIVATED`, it is not returned by the `ACTIVE` filter, and it is not counted as an active trainer on the overview

#### Scenario: Club reactivated
- **WHEN** that club is reactivated
- **THEN** the same assignment's access state is `ACTIVE` again

#### Scenario: Filter by club name
- **WHEN** an admin lists trainers with a club name search
- **THEN** only assignments at clubs whose name contains the search, case-insensitively, are returned

#### Scenario: Provisioned before invitations or redacted
- **WHEN** an assignment has no accepted invitation, or its invitation's email was redacted
- **THEN** its invited email is null

#### Scenario: No athlete data
- **WHEN** a trainer in the list also appears elsewhere in the system
- **THEN** the entry contains no athlete record, no user id and no data beyond the fields above

#### Scenario: Not an admin
- **WHEN** a non-admin lists trainers
- **THEN** the request is rejected as forbidden

### Requirement: Admins read the admin action log
The system SHALL let an admin list admin action records, newest first, with cursor pagination (default 20, maximum 50), optionally filtered by action and by club. Each entry SHALL carry:
- its id, action, target type and target id, and time
- the related club's `id` and `name`
- the non-sensitive metadata the record holds (changed field names and cancelled counts)
- the acting admin: whether it is the caller, and the actor's current auth email when available

The request id and the actor's internal ids SHALL NOT be returned.

#### Scenario: Newest first
- **WHEN** an admin lists the log
- **THEN** records are returned newest first, from every admin

#### Scenario: Own action
- **WHEN** a record was made by the calling admin
- **THEN** the entry marks the actor as the caller

#### Scenario: Another admin's action
- **WHEN** a record was made by another admin whose auth account exists
- **THEN** the entry carries that admin's email

#### Scenario: Email unavailable
- **WHEN** the acting admin's auth account no longer exists or the email lookup fails
- **THEN** the entry carries no email and the list still loads

#### Scenario: Filter by club
- **WHEN** an admin lists the log for one club
- **THEN** only records whose target is that club, or a trainer assignment or trainer invitation of that club, are returned

#### Scenario: Filter by action
- **WHEN** an admin lists the log for one action
- **THEN** only records of that action are returned

#### Scenario: No sensitive data
- **WHEN** any entry is returned
- **THEN** it contains no invitee email, no L2 field and no request id

#### Scenario: Not an admin
- **WHEN** a non-admin lists the log
- **THEN** the request is rejected as forbidden

#### Scenario: Reading does not write
- **WHEN** an admin lists the log
- **THEN** no admin action record is created
