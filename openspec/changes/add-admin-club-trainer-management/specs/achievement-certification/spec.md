# Spec Delta

## ADDED Requirements

### Requirement: Deactivated clubs take no certification requests
The system SHALL reject a certification request made to a deactivated club, even when the athlete's membership with it is still `ACTIVE`.

#### Scenario: Request to a deactivated club
- **WHEN** an athlete with an `ACTIVE` membership in deactivated club A requests certification from club A
- **THEN** the request is rejected as forbidden and nothing is stored

## MODIFIED Requirements

### Requirement: Leaving a club cancels its open requests
The system SHALL cancel every `PENDING` certification request made to a club when the athlete's membership with that club leaves `ACTIVE`, or when the club is deactivated, in the same operation, returning those achievements to `UNVERIFIED`.

#### Scenario: Athlete leaves with an open request
- **WHEN** an athlete with a `PENDING` request to club A leaves club A
- **THEN** the membership is `COMPLETED`, the request is `CANCELLED`, and the achievement is `UNVERIFIED`

#### Scenario: Club deactivated with an open request
- **WHEN** an admin deactivates club A while an athlete has a `PENDING` request to club A
- **THEN** the request is `CANCELLED`, the achievement is `UNVERIFIED`, and the athlete's membership is still `ACTIVE`

#### Scenario: Club reactivated
- **WHEN** club A is reactivated after its deactivation cancelled a request
- **THEN** the request stays `CANCELLED` and the athlete can request certification again
