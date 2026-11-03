# Spec Delta

## MODIFIED Requirements

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
