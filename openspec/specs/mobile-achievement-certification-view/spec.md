# mobile-achievement-certification-view Specification

## Purpose

Defines how the mobile app shows the athlete each achievement's verification status and lets them ask an active club to certify it, following ADR-016.

## Requirements

### Requirement: Achievements show one of four statuses
Each of the athlete's own achievements SHALL show exactly one status chip with a matching accessible label. Pending applies when an open request exists. Rejected applies when the latest request was rejected. Verified applies when the achievement is verified. Unverified applies otherwise.

#### Scenario: New achievement
- **WHEN** the athlete adds an achievement
- **THEN** it shows the Unverified chip

#### Scenario: Open request
- **WHEN** the achievement has a PENDING certification request
- **THEN** it shows the Pending chip

#### Scenario: Rejected request
- **WHEN** the latest request for the achievement was rejected and no newer request exists
- **THEN** it shows the Rejected chip

### Requirement: Certification is requested from an active club only
The request action SHALL appear only on Unverified or Rejected achievements. It SHALL let the athlete choose among clubs where their membership is `ACTIVE`. If the athlete has no active club, the action SHALL be disabled and explain why.

#### Scenario: Requesting certification
- **WHEN** the athlete picks an active club and submits
- **THEN** the achievement shows Pending with that club's name after the server confirms

#### Scenario: No active club
- **WHEN** the athlete has no active membership
- **THEN** the request action is disabled and explains that an active club is required

#### Scenario: Verified achievement
- **WHEN** an achievement is Verified
- **THEN** no request action is offered

### Requirement: Athlete can withdraw a pending request
A Pending achievement SHALL offer Withdraw. After the server confirms the withdrawal, the achievement SHALL show Unverified and the request action SHALL be available again.

#### Scenario: Withdrawing
- **WHEN** the athlete confirms Withdraw on a Pending achievement
- **THEN** the achievement shows Unverified and can be submitted again

### Requirement: Rejection reason is shown to the athlete
A Rejected achievement SHALL show the rejecting club's name and the trainer's rejection reason. It SHALL also offer a new request.

#### Scenario: Reading a rejection
- **WHEN** the athlete opens a Rejected achievement
- **THEN** the club name and rejection reason are displayed with an option to request again

### Requirement: Certification errors are user-facing
If a certification request or withdrawal fails, for example because a request is already open or the membership is no longer active, the screen SHALL keep the previous status, show a user-facing message, and refresh the achievement's status.

#### Scenario: Membership ended meanwhile
- **WHEN** the athlete submits a request to a club whose membership has ended
- **THEN** an error message is shown and the achievement keeps its prior status
