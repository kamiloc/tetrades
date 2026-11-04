# Spec Delta

## ADDED Requirements

### Requirement: Deletion closes trainer invitations addressed to the athlete
The system SHALL, when deleting an athlete, revoke every `PENDING` trainer invitation addressed to the athlete's confirmed email and replace that email with a redacted marker, and SHALL include this in deletion verification. An athlete account never holds trainer assignments, so deletion has no trainer records to remove.

#### Scenario: Pending invitation to the athlete's email
- **WHEN** an athlete is deleted while a `PENDING` trainer invitation addresses their email
- **THEN** the invitation is `REVOKED` and its email is redacted before the request is `COMPLETED`

#### Scenario: Verification finds an invitation email
- **WHEN** verification finds any trainer invitation still carrying the deleted athlete's email
- **THEN** the request status becomes `FAILED` and an error is logged with the request id

#### Scenario: Ended invitation to the athlete's email
- **WHEN** an athlete is deleted and a declined, revoked, or expired invitation still carries their email
- **THEN** that email is redacted as well
