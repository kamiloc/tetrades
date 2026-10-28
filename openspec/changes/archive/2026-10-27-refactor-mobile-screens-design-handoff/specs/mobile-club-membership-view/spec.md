# Spec Delta

## Purpose

Defines how the athlete reviews club invitations, accepts or declines them, sees their club history, and leaves a club in the mobile app. This enforces the ADR-013 rule that a club cannot associate an athlete without the athlete's confirmation.

## ADDED Requirements

### Requirement: Pending invitations are listed for a decision
The Clubs tab SHALL list every membership in `PENDING_ATHLETE_CONFIRMATION` as an invitation that shows the club name, with separate Accept and Decline actions.

#### Scenario: Athlete has an invitation
- **WHEN** a trainer of Club A has invited the athlete
- **THEN** the Club invitations section shows Club A with Accept and Decline

#### Scenario: No invitations
- **WHEN** the athlete has no pending memberships
- **THEN** the Club invitations section shows its empty row

### Requirement: Only explicit acceptance activates a membership
Accepting an invitation SHALL send an `ACTIVE` response, and declining SHALL send a `REJECTED` response. The UI SHALL show the membership as active only after the server confirms the response. Declining SHALL require a confirmation step.

#### Scenario: Athlete accepts
- **WHEN** the athlete taps Accept and the server confirms
- **THEN** the club moves from invitations to active clubs
- **AND** the Clubs badge count decreases by one

#### Scenario: Athlete declines
- **WHEN** the athlete taps Decline and confirms
- **THEN** the invitation is removed and the club is not shown as active

#### Scenario: Response fails
- **WHEN** the server rejects the response
- **THEN** the invitation stays in the list and a user-facing error is shown

### Requirement: Club history shows memberships chronologically
The Clubs tab SHALL show the athlete's active memberships, and their ended memberships with end dates, newest first. Rejected invitations SHALL NOT appear in the history.

#### Scenario: Active and ended clubs
- **WHEN** the athlete has one active and one ended membership
- **THEN** both appear, the ended one with its end date

#### Scenario: Rejected invitation
- **WHEN** the athlete previously declined Club B
- **THEN** Club B does not appear in club history

### Requirement: Athlete can leave an active club
Each active membership SHALL offer a Leave action behind a confirmation. The confirmation SHALL state that leaving ends the club's access to report metrics and cancels any open certification requests to that club.

#### Scenario: Athlete leaves
- **WHEN** the athlete confirms Leave on an active membership
- **THEN** the membership is shown as ended after the server confirms

### Requirement: Clubs view does not imply trainer access to private data
The Clubs tab SHALL NOT show or suggest that trainers can see the athlete's private profile or L2 data.

#### Scenario: Reviewing an invitation
- **WHEN** an invitation is displayed
- **THEN** its copy describes metric reporting and certification only, not access to private identity data
