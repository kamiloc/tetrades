# Spec Delta

## MODIFIED Requirements

### Requirement: Membership starts as an invitation
The system SHALL allow a trainer to invite an athlete to the trainer's own club, creating a membership in `PENDING_ATHLETE_CONFIRMATION`. The club must be active.

#### Scenario: Trainer invites athlete
- **WHEN** a trainer of club A invites an athlete who has no open membership with club A
- **THEN** a membership for that athlete and club A exists with status `PENDING_ATHLETE_CONFIRMATION`

#### Scenario: Trainer invites for another club
- **WHEN** a trainer of club A attempts to invite an athlete to club B
- **THEN** the request is rejected as forbidden and no membership is created

#### Scenario: Duplicate open membership
- **WHEN** an invitation is sent for an athlete who already has a `PENDING_ATHLETE_CONFIRMATION` or `ACTIVE` membership with the same club
- **THEN** the request is rejected and no second membership is created

#### Scenario: Deactivated club
- **WHEN** a trainer of a deactivated club attempts to invite an athlete
- **THEN** the request is rejected as forbidden and no membership is created

### Requirement: Only the athlete can accept or reject an invitation
The system SHALL activate a membership only when the invited athlete confirms it, and SHALL move it to `REJECTED` when the athlete declines. The only other way a membership becomes `REJECTED` is the deactivation of its club, which closes every pending invitation of that club.

#### Scenario: Athlete accepts
- **WHEN** the invited athlete accepts a `PENDING_ATHLETE_CONFIRMATION` membership
- **THEN** the status becomes `ACTIVE`

#### Scenario: Athlete rejects
- **WHEN** the invited athlete rejects a `PENDING_ATHLETE_CONFIRMATION` membership
- **THEN** the status becomes `REJECTED`

#### Scenario: Someone else responds
- **WHEN** a trainer or a different athlete attempts to accept or reject the invitation
- **THEN** the request is rejected as forbidden and the status is unchanged

#### Scenario: Club deactivated
- **WHEN** an admin deactivates a club that has a `PENDING_ATHLETE_CONFIRMATION` membership
- **THEN** the membership becomes `REJECTED`, the athlete can no longer accept it, and the athlete is told by push that a club invitation is no longer available

#### Scenario: Accepting after deactivation
- **WHEN** the athlete tries to accept an invitation whose club was deactivated
- **THEN** the request is rejected and the membership stays `REJECTED`
