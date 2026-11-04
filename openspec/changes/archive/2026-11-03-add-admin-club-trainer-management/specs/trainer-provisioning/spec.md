# Spec Delta

## Purpose

Lets platform admins give a person trainer access to one club by email, with that person's explicit acceptance, and take it away again without losing the record of what they did as a trainer.

## ADDED Requirements

### Requirement: Admins invite trainers by email
The system SHALL let an admin invite an email address to become a trainer of an active club, creating a trainer invitation in `PENDING` with an expiry time. The invitee does not need an existing account. The system does not send the invitation by email; the admin tells the invitee to sign in on the trainer portal with that exact address.

#### Scenario: Invite a new person
- **WHEN** an admin invites an email that no account uses yet to an active club
- **THEN** a `PENDING` trainer invitation for that email and club exists with an expiry, and the result includes the expiry so the admin can tell the invitee

#### Scenario: Deactivated club
- **WHEN** an admin invites a trainer to a deactivated club
- **THEN** the request is rejected as invalid and no invitation is created

#### Scenario: Invalid email
- **WHEN** an admin invites a malformed email address
- **THEN** the request is rejected as invalid

### Requirement: One pending trainer invitation per club and email
The system SHALL allow at most one `PENDING` trainer invitation per club and email, comparing emails case-insensitively. This SHALL be guaranteed by the database, not only by the API.

#### Scenario: Duplicate invitation
- **WHEN** an admin invites `Ana@Club.co` to a club that already has a `PENDING` invitation for `ana@club.co`
- **THEN** the request is rejected as a conflict and the existing invitation is unchanged

#### Scenario: Differently cased duplicate written directly
- **WHEN** a server-side writer inserts a `PENDING` invitation whose email differs only in letter case from an existing `PENDING` invitation for the same club
- **THEN** the database rejects the write

#### Scenario: Already a trainer
- **WHEN** an admin invites the email of someone who is already a non-revoked trainer of that club
- **THEN** the request is rejected as a conflict

### Requirement: Trainer invitation lifecycle
The system SHALL allow only `PENDING → ACCEPTED`, `PENDING → DECLINED`, and `PENDING → REVOKED`. `ACCEPTED`, `DECLINED`, and `REVOKED` are terminal. A `PENDING` invitation past its expiry SHALL be treated as expired and cannot be accepted or declined.

#### Scenario: Reopen a terminal invitation
- **WHEN** any transition is attempted from `ACCEPTED`, `DECLINED`, or `REVOKED`
- **THEN** the request is rejected and the status is unchanged

#### Scenario: Expired invitation
- **WHEN** the invitee tries to accept a `PENDING` invitation whose expiry has passed
- **THEN** the request is rejected and no trainer access is granted

#### Scenario: Re-invite after a terminal state
- **WHEN** an admin invites an email whose earlier invitation to the club is declined, revoked, or expired
- **THEN** a new `PENDING` invitation is created and the earlier one is unchanged apart from an expired one being closed as `REVOKED`

### Requirement: Only the verified invitee responds
The system SHALL let a signed-in user see and respond to a trainer invitation only when their session's email is confirmed by the identity provider and matches the invitation's email, compared case-insensitively. An email that is present but unconfirmed SHALL be treated as no email. Clients SHALL NOT read trainer invitations directly from the database.

#### Scenario: Invitee lists invitations
- **WHEN** a user signs in with the invited, confirmed email
- **THEN** they see the club's pending, unexpired invitation and can accept or decline it

#### Scenario: Different user
- **WHEN** a user whose confirmed email differs from the invitation's email attempts to read, accept, or decline it
- **THEN** the request is rejected as not found and the invitation is unchanged

#### Scenario: Unconfirmed email
- **WHEN** a signed-in user whose email matches the invitation but is not confirmed lists, accepts, or declines it
- **THEN** no invitations are returned and accept or decline is rejected as not found

#### Scenario: Direct database read
- **WHEN** any client, including the invitee, queries trainer invitations directly from the database
- **THEN** no rows are returned

### Requirement: Accepting makes the invitee a trainer
The system SHALL, when the invitee accepts a `PENDING`, unexpired invitation to an active club, mark it `ACCEPTED` and make the invitee's account a trainer of that club in the same operation. The account SHALL NOT be an athlete or an admin.

#### Scenario: Accept
- **WHEN** the invitee, whose account has no athlete profile and is not an admin, accepts a valid invitation
- **THEN** the invitation is `ACCEPTED` and the invitee can use trainer procedures for that club

#### Scenario: Decline
- **WHEN** the invitee declines a valid invitation
- **THEN** the invitation is `DECLINED` and the invitee has no trainer access to that club

#### Scenario: Club deactivated meanwhile
- **WHEN** the invitee accepts an invitation to a club that has since been deactivated
- **THEN** the request is rejected and no trainer access is granted

#### Scenario: Athlete or admin account
- **WHEN** the invitee's account has an athlete profile or role `ADMIN`
- **THEN** accepting is rejected as forbidden and the invitation stays `PENDING`

### Requirement: Admins revoke invitations and trainers
The system SHALL let an admin revoke a `PENDING` trainer invitation and revoke an active trainer of a club. Revoking a trainer ends their access to that club at once and SHALL NOT delete the trainer record.

#### Scenario: Revoke a trainer
- **WHEN** an admin revokes a trainer of club A
- **THEN** that user's next trainer-only call for club A is rejected as forbidden, and metric entries and certification decisions they made still name them as the reporter or decider

#### Scenario: Revoke an already revoked trainer
- **WHEN** an admin revokes a trainer who is already revoked
- **THEN** the request is rejected as invalid and nothing changes

#### Scenario: Return after revocation
- **WHEN** an admin invites a revoked trainer's email again and they accept
- **THEN** they regain trainer access to the club

### Requirement: Revocation stops trainer writes already in progress
The system SHALL ensure that a trainer write that has not committed when the trainer's revocation commits does not take effect. Trainer reads already in progress MAY finish.

#### Scenario: Revocation races a metric entry
- **WHEN** an admin revokes a trainer while that trainer's metric entry for club A is being written
- **THEN** either the entry committed before the revocation, or the entry is rejected as forbidden; no entry is stored after the revocation took effect

#### Scenario: Revocation races a certification decision
- **WHEN** an admin revokes a trainer while that trainer's certification decision is being written
- **THEN** either the decision committed before the revocation, or the request stays `PENDING`

### Requirement: Admins see a club's trainers and invitations
The system SHALL let an admin list a club's trainers (active and revoked) and its trainer invitations with their status, including expired, using cursor pagination (default 20, maximum 50). A trainer entry SHALL show the address the trainer was originally invited with, labelled as such, and SHALL NOT include L2 data.

#### Scenario: Club with mixed trainers
- **WHEN** an admin lists the trainers of a club with one active and one revoked trainer
- **THEN** both are returned with their status

#### Scenario: Trainer email shown
- **WHEN** an admin lists a trainer who joined through an invitation
- **THEN** the entry shows the originally invited address, labelled as the invited address, even if the trainer's sign-in email has since changed

### Requirement: Ended invitations lose their email after 90 days
The system SHALL, on a schedule, replace the email of every invitation that ended (declined, revoked, or expired) more than 90 days ago with a redacted marker, keeping the rest of the record. An `ACCEPTED` invitation SHALL keep its email while the trainer it created is active, and SHALL be redacted 90 days after that trainer is revoked.

#### Scenario: Old declined invitation
- **WHEN** the scheduled redaction runs and an invitation was declined 91 days ago
- **THEN** its email is replaced by the redacted marker and its status, club, and dates are unchanged

#### Scenario: Active trainer's invitation
- **WHEN** the scheduled redaction runs and an accepted invitation belongs to a trainer who is still active
- **THEN** its email is unchanged

#### Scenario: Redaction failure
- **WHEN** a redaction run fails
- **THEN** it is retried, and if it still fails an error is logged with the request id and no partial state hides which rows were processed
