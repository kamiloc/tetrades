# Spec Delta

## Purpose

Tells athletes when something requires their consent or attention, without placing personal data in the notification queue.

## ADDED Requirements

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
