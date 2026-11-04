# Spec Delta

## ADDED Requirements

### Requirement: Athlete is notified when a club invitation is closed
The system SHALL send a push notification to the athlete when their pending club invitation is closed because the club was deactivated, if the athlete has a registered device. The notification SHALL name no club, and a failed notification SHALL NOT fail the deactivation.

#### Scenario: Closed invitation notification
- **WHEN** an admin deactivates a club that has a pending invitation for an athlete with a registered device
- **THEN** the athlete receives a notification saying a club invitation is no longer available, naming no club

#### Scenario: Notification cannot be queued
- **WHEN** the notification for a closed invitation cannot be enqueued
- **THEN** the club is still deactivated and the admin receives no error

## MODIFIED Requirements

### Requirement: Club trainers are notified of a certification request
The system SHALL send a push notification to each non-revoked trainer of the chosen club when an athlete requests certification of an achievement, for trainers with a registered device. A failed notification SHALL NOT fail the request.

#### Scenario: Request notification
- **WHEN** an athlete requests certification from a club whose trainers have registered devices
- **THEN** each of those trainers receives a notification naming no athlete, achievement, or L2 data

#### Scenario: Notification cannot be queued
- **WHEN** the notification for a new request cannot be enqueued
- **THEN** the certification request still exists and the athlete receives no error

#### Scenario: Revoked trainer
- **WHEN** an athlete requests certification from a club that has a revoked trainer with a registered device
- **THEN** the revoked trainer receives no notification
