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
The system SHALL treat a user as a trainer of a club only if a non-revoked `ClubTrainer` record links the user to that club and the club is active, and SHALL NOT introduce a global trainer role.

#### Scenario: User without records
- **WHEN** a user with no `ClubTrainer` record calls a trainer-only procedure
- **THEN** the request is rejected as forbidden

#### Scenario: Cross-club authority
- **WHEN** a trainer of club A acts on a membership or entry belonging to club B
- **THEN** the request is rejected as forbidden

#### Scenario: Revoked trainer
- **WHEN** a user whose only `ClubTrainer` record for club A is revoked calls a trainer-only procedure for club A
- **THEN** the request is rejected as forbidden at both the API and the database layers

#### Scenario: Deactivated club
- **WHEN** a non-revoked trainer of a deactivated club calls a trainer-only procedure for that club
- **THEN** the request is rejected as forbidden at both the API and the database layers

#### Scenario: Admin is not a trainer
- **WHEN** an admin with no `ClubTrainer` record calls a trainer-only procedure
- **THEN** the request is rejected as forbidden

### Requirement: Trainers read only club-scoped data
The system SHALL limit a trainer's athlete reads to three things: memberships and metric entries of the trainer's own club with `ACTIVE` status; invitations to the trainer's own club that this trainer sent and that are still `PENDING_ATHLETE_CONFIRMATION`, limited to the invitee's L0 identity (`id`, `slug`, `displayName`, sport) and the invitation status; and achievement certification requests made to the trainer's own club while they are `PENDING`. The only other read is the invite lookup: an athlete's L0 identity, for searchable athletes by name or for any athlete with an `ACTIVE` profile by exact `slug`. The trainer-only reads (roster, one roster athlete, invite lookup, certification queue) never reveal the athlete's memberships with other clubs; data the athlete's own visibility settings make visible to the viewer, such as metric entries, follows those settings.

#### Scenario: Roster
- **WHEN** a trainer lists athletes of their club
- **THEN** only athletes with `ACTIVE` memberships are returned with club-scoped data; pending invitees appear only as invitations the trainer sent, without athlete profile details beyond L0 identity

#### Scenario: Own pending invitation
- **WHEN** a trainer reads an invitation they sent to their club that the athlete hasn't answered
- **THEN** the trainer sees the invitee's L0 identity and the pending status, and reads no metric entries, achievements or certification requests of that athlete through the club

#### Scenario: Another trainer's pending invitation
- **WHEN** a trainer reads the roster, one roster athlete, or the invite lookup, while another trainer of the same club has a pending invitation to an athlete
- **THEN** that invitation is not returned or revealed

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

#### Scenario: Invite lookup
- **WHEN** a trainer looks up an athlete to invite who has no membership with the trainer's club
- **THEN** only the athlete's `id`, `slug`, `displayName` and sport are returned, and the lookup gives no access to the athlete's metrics, memberships, achievements or private profile

#### Scenario: Non-searchable athlete without the slug
- **WHEN** a trainer searches by name for an athlete who isn't searchable
- **THEN** the athlete is not returned, and can be found only by their exact `slug`

#### Scenario: Other clubs' memberships
- **WHEN** an athlete the trainer can read has a membership with another club, even with a public club-membership visibility setting
- **THEN** no trainer-only read names, identifies or counts that membership

#### Scenario: Entries the athlete made visible
- **WHEN** an athlete's metric visibility lets the trainer see entries reported by another club
- **THEN** those entries are returned under the athlete's visibility settings, not through the trainer's club authority
