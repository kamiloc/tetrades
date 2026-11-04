# Spec Delta

## MODIFIED Requirements

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
