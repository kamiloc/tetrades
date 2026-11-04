# Spec Delta

## ADDED Requirements

### Requirement: Inactive clubs are labelled
The Clubs tab SHALL mark every deactivated club with an "Inactive club" label wherever it appears, and SHALL keep the Leave action available for an `ACTIVE` membership of an inactive club.

#### Scenario: Active membership of an inactive club
- **WHEN** the athlete has an `ACTIVE` membership in a club that was deactivated
- **THEN** the club appears in club history with the "Inactive club" label and a Leave action

#### Scenario: Active club
- **WHEN** the athlete's club is active
- **THEN** no inactive label is shown

## MODIFIED Requirements

### Requirement: Club history shows memberships chronologically
The Clubs tab SHALL show the athlete's active memberships, and their ended memberships with end dates, newest first. Rejected invitations SHALL NOT appear in the history, including invitations closed because their club was deactivated.

#### Scenario: Active and ended clubs
- **WHEN** the athlete has one active and one ended membership
- **THEN** both appear, the ended one with its end date

#### Scenario: Rejected invitation
- **WHEN** the athlete previously declined Club B
- **THEN** Club B does not appear in club history

#### Scenario: Invitation closed by deactivation
- **WHEN** the athlete's pending invitation from Club C was closed because Club C was deactivated
- **THEN** Club C appears neither in invitations nor in club history
