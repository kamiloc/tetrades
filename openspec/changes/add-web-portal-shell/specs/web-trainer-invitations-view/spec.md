# Spec Delta

## Purpose

Defines how a person invited to be a club trainer finds and answers the invitation on the web, so that becoming a trainer is always an explicit choice made by the owner of the invited email.

## ADDED Requirements

### Requirement: Invitee sees invitations for their email
The trainer invitations page SHALL show the signed-in user the pending, unexpired trainer invitations for their confirmed email, each with the club's name, city, and the expiry date, and SHALL name the email the page is checking.

#### Scenario: Invitation present
- **WHEN** a user with a pending invitation opens `/trainer/invitations`
- **THEN** the invitation is shown with the club, expiry date, and Accept and Decline actions

#### Scenario: No invitations
- **WHEN** a user with no pending invitations opens the page
- **THEN** the page states there are no trainer invitations for their email and suggests signing in with the invited address if they expected one

### Requirement: Invitee accepts or declines
The page SHALL let the user accept or decline each invitation. Declining SHALL ask for confirmation. After accepting, the page SHALL confirm the user is now a trainer of that club.

#### Scenario: Accept
- **WHEN** the user accepts an invitation
- **THEN** the page confirms they are a trainer of that club and the invitation leaves the list

#### Scenario: Decline
- **WHEN** the user confirms declining an invitation
- **THEN** the invitation leaves the list and no trainer access is granted

#### Scenario: Invitation no longer valid
- **WHEN** the user answers an invitation that has expired, was revoked, or whose club was deactivated in the meantime
- **THEN** the page says the invitation is no longer available and refreshes the list

### Requirement: The page explains accounts that cannot accept
The page SHALL explain, when accepting is refused because the account is an athlete or admin account, that a trainer needs a separate account with a different email, and SHALL explain, when the account's email is not confirmed, that the email must be confirmed before invitations can be seen.

#### Scenario: Athlete account
- **WHEN** a user whose account is an athlete account tries to accept
- **THEN** the page explains that trainer access needs a separate account with a different email, and the invitation stays pending

#### Scenario: Unconfirmed email
- **WHEN** the signed-in account's email is not confirmed
- **THEN** the page explains that invitations appear only for a confirmed email and lists none
