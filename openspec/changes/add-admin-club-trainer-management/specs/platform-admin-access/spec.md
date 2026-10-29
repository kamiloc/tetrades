# Spec Delta

## Purpose

Defines who platform admins are, how their authority is checked, what they may and may not touch, and how their actions are recorded, so that club and trainer management never becomes a path to athlete data.

## ADDED Requirements

### Requirement: Admin role is provisioned only out-of-band
The system SHALL treat a user as an admin only when their account role is `ADMIN`. The system SHALL NOT provide any procedure, page, or job that grants, removes, or changes an account's role; the project owner sets it directly in the database.

#### Scenario: New sign-up
- **WHEN** a new user signs in for the first time
- **THEN** their account role is `ATHLETE`, not `ADMIN`

#### Scenario: No role-changing endpoint
- **WHEN** any authenticated caller, including an admin, attempts to change an account's role through the API
- **THEN** no procedure exists for it and the role is unchanged

### Requirement: Admins sign in with the platform's standard authentication
The system SHALL authenticate admins only through the same Magic Link and OTP sign-in used by every user. The system SHALL NOT store or verify passwords for admins.

#### Scenario: Admin signs in
- **WHEN** an admin requests a Magic Link or OTP for their email and completes it
- **THEN** they receive a normal platform session and can use admin procedures

### Requirement: Admin procedures check the role on every call
The system SHALL allow an admin-only operation only when the caller's account role is `ADMIN` at the time of the call, resolved from the verified session and never from client-supplied data.

#### Scenario: Admin calls an admin procedure
- **WHEN** a caller whose account role is `ADMIN` calls an admin-only procedure
- **THEN** the call proceeds

#### Scenario: Non-admin calls an admin procedure
- **WHEN** a caller whose role is `ATHLETE` or `SYSTEM`, or who is a trainer, calls an admin-only procedure
- **THEN** the request is rejected as forbidden and nothing changes

#### Scenario: Unauthenticated call
- **WHEN** a caller without a valid session calls an admin-only procedure
- **THEN** the request is rejected as unauthorized

#### Scenario: Role removed
- **WHEN** the owner changes an admin's role away from `ADMIN` in the database
- **THEN** the admin's next call to an admin-only procedure is rejected as forbidden

### Requirement: An account acts in exactly one capacity
The system SHALL let each account be at most one of: an athlete (has an athlete profile), a trainer (has trainer assignments, active or revoked), or an admin (role `ADMIN`). A person who needs more than one capacity SHALL use a separate account, with a separate email, for each. This SHALL hold for every writer, including server-side ones.

#### Scenario: Admin attempts athlete onboarding
- **WHEN** an account with role `ADMIN` submits athlete onboarding
- **THEN** the request is rejected as forbidden and no athlete profile is created

#### Scenario: Trainer attempts athlete onboarding
- **WHEN** an account that has any trainer assignment, active or revoked, submits athlete onboarding
- **THEN** the request is rejected as forbidden with a message that trainer accounts use the web portal, and no athlete profile is created

#### Scenario: Athlete accepts a trainer invitation
- **WHEN** an account with an athlete profile accepts a trainer invitation sent to its email
- **THEN** the request is rejected as forbidden with a message to sign in with a different email, and no trainer assignment is created

#### Scenario: Admin accepts a trainer invitation
- **WHEN** an account with role `ADMIN` accepts a trainer invitation sent to its email
- **THEN** the request is rejected as forbidden and no trainer assignment is created

#### Scenario: Direct database write
- **WHEN** any writer, including the server, inserts a trainer assignment for an account with an athlete profile, or an athlete profile for an account with a trainer assignment
- **THEN** the database rejects the write

### Requirement: Admin authority is limited to clubs and trainer access
The system SHALL limit admins to creating, editing, deactivating, and reactivating clubs, and to inviting and revoking trainers. Admins SHALL NOT read or write L2-CONFIDENTIAL data, private profiles, athlete records beyond what other users may see, metric entries, certification requests, visibility settings, legal holds, or the security audit log.

#### Scenario: Admin requests athlete private data
- **WHEN** an admin requests an athlete's private profile or any L2 field
- **THEN** the request is denied exactly as it would be for any other non-owner

#### Scenario: Admin attempts a legal hold
- **WHEN** an admin attempts to set or clear an athlete's legal hold
- **THEN** no procedure exists for it and the hold is unchanged

#### Scenario: Admin reads the security audit log
- **WHEN** an admin attempts to read another user's security audit events
- **THEN** the request is denied

### Requirement: Every admin write is recorded
The system SHALL record every successful admin write in an append-only admin action log with the acting admin, the action, the target type and id, the request id, non-sensitive metadata, and the time. Records SHALL contain no email addresses and no L2 data.

#### Scenario: Admin creates a club
- **WHEN** an admin creates a club
- **THEN** an admin action record names the admin, the create action, and the new club

#### Scenario: Failed admin write
- **WHEN** an admin write is rejected
- **THEN** no admin action record claims it succeeded

#### Scenario: Trainer invited
- **WHEN** an admin invites a trainer
- **THEN** the admin action record identifies the invitation by id and contains no email address

### Requirement: The admin action log is written only by the API and never by clients
The system SHALL insert admin action records only through the API's own database connection. Client database roles (anonymous and authenticated users) SHALL NOT be able to read, insert, update, or delete them.

#### Scenario: Client reads the log
- **WHEN** any authenticated user, including an admin, queries the admin action log directly
- **THEN** no rows are returned

#### Scenario: Client write attempt
- **WHEN** any client attempts to insert, update, or delete an admin action record
- **THEN** the attempt is denied and no record is created or changed
