# membership-notifications Specification

## Purpose

Tells athletes when something requires their consent or attention, without placing personal data in the notification queue.

## Requirements

### Requirement: Athlete is notified of a club invitation
The system SHALL send a push notification to the invited athlete when a club invitation is created, if the athlete has a registered device.

#### Scenario: Invitation notification
- **WHEN** a trainer invites an athlete who has a registered device
- **THEN** a notification for that athlete is delivered naming no L2 data

#### Scenario: No registered device
- **WHEN** the invited athlete has no registered device
- **THEN** the invitation still exists and no delivery error is surfaced to the trainer

### Requirement: Notification payloads carry identifiers only
The system SHALL place only record identifiers and a notification type in queued notification jobs, never free text or personal data.

#### Scenario: Job payload
- **WHEN** a notification job is enqueued
- **THEN** its payload contains the recipient account id, type, subject id, and request id only

### Requirement: Club trainers are notified of a certification request
The system SHALL send a push notification to each trainer of the chosen club when an athlete requests certification of an achievement, for trainers with a registered device. A failed notification SHALL NOT fail the request.

#### Scenario: Request notification
- **WHEN** an athlete requests certification from a club whose trainers have registered devices
- **THEN** each of those trainers receives a notification naming no athlete, achievement, or L2 data

#### Scenario: Notification cannot be queued
- **WHEN** the notification for a new request cannot be enqueued
- **THEN** the certification request still exists and the athlete receives no error

### Requirement: Athlete is notified of a certification decision
The system SHALL send a push notification to the athlete when a trainer approves or rejects their certification request, if the athlete has a registered device. A failed notification SHALL NOT undo the decision.

#### Scenario: Decision notification
- **WHEN** a trainer approves or rejects a request from an athlete with a registered device
- **THEN** the athlete receives a notification naming no club, trainer, achievement, or rejection reason

#### Scenario: Notification cannot be queued
- **WHEN** the notification for a decision cannot be enqueued
- **THEN** the decision is stored and the trainer receives no error
