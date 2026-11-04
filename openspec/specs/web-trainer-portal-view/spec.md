# web-trainer-portal-view Specification

## Purpose

Defines how a club trainer works on the web: picking a club, viewing the roster, inviting athletes, viewing an athlete's metrics and logging entries, and deciding certification requests. The pages reach only what the trainer API allows and never suggest access the trainer doesn't have.

## Requirements

### Requirement: A trainer lands on their club
After sign-in, the web app SHALL send a non-admin without a return target to the trainer area. There, a trainer of one club SHALL go straight to that club's roster, and a trainer of several clubs SHALL see a club picker. A user who trains no club SHALL see a message that links to the trainer invitations page.

#### Scenario: One club
- **WHEN** a trainer of exactly one active club signs in, or opens `/trainer`
- **THEN** they land on that club's roster

#### Scenario: Several clubs
- **WHEN** a trainer of several active clubs opens `/trainer`
- **THEN** they see a picker listing those clubs, and choosing one opens its roster

#### Scenario: No club
- **WHEN** a signed-in user who trains no active club opens `/trainer`
- **THEN** they see that they aren't a trainer of any club yet, with a link to the trainer invitations page

#### Scenario: Admin
- **WHEN** an admin signs in without a return target
- **THEN** they still land on the admin club list

### Requirement: The trainer can switch clubs
The trainer shell SHALL show the current club's name and, for a trainer of several clubs, SHALL let them switch to another club from any club page.

#### Scenario: Switching
- **WHEN** a trainer of clubs A and B switches from A to B on A's roster
- **THEN** B's roster opens

### Requirement: Club pages refuse other clubs
For a club the signed-in user doesn't train, or a club that isn't active, the web app SHALL show a "not a trainer of this club" page and load no club data.

#### Scenario: Another club's URL
- **WHEN** a trainer of club A opens a page of club B
- **THEN** they see the "not a trainer of this club" page

#### Scenario: Access removed meanwhile
- **WHEN** a trainer's access to a club is revoked, or the club is deactivated, while one of its pages is open
- **THEN** the next action shows the "not a trainer of this club" page instead of a generic error

### Requirement: The trainer sees the club roster
The roster page SHALL list the club's active athletes and the invitations this trainer sent that are still pending, each with the athlete's name, handle, sport and status, newest first, with Load more.

#### Scenario: Active and pending
- **WHEN** a trainer opens the roster of a club with active athletes and their own pending invitations
- **THEN** both appear, pending ones marked "Waiting for the athlete"

#### Scenario: Empty roster
- **WHEN** the roster has no athletes
- **THEN** an empty state offers to invite an athlete

### Requirement: The trainer invites an athlete
The invite dialog SHALL find an athlete by a pasted public profile link or profile handle (the athlete's `slug`), or by a name search among searchable athletes, and SHALL send the invitation only after the trainer picks one result. It SHALL explain that the athlete must confirm before joining.

#### Scenario: By profile link
- **WHEN** a trainer pastes an athlete's public profile link and picks the result
- **THEN** the invitation is sent, the dialog says the athlete must confirm, and the roster shows them as pending without a reload

#### Scenario: By name
- **WHEN** a trainer types at least two characters of a name
- **THEN** matching searchable athletes are listed with name, handle and sport

#### Scenario: Already related
- **WHEN** a result is already an active member, or already invited by this trainer
- **THEN** it is shown as such and can't be invited again

#### Scenario: Conflict
- **WHEN** sending is answered with a conflict, for example another trainer already invited the athlete
- **THEN** the dialog says the athlete already has a pending or active membership with the club, and nothing changes

#### Scenario: Nothing found
- **WHEN** a link, handle or name matches no athlete
- **THEN** the dialog says no athlete was found, and suggests asking the athlete for their profile link

### Requirement: The trainer views an athlete's metrics
For an active member, the athlete page SHALL show the athlete's metric summaries (latest and best, with dates) and their entries, newest first, with Load more. Each entry SHALL be attributed to the reporting club, never to a person. For a pending invitee, it SHALL show only that the invitation awaits the athlete's confirmation.

#### Scenario: Active member
- **WHEN** a trainer opens an active member's page
- **THEN** the summaries and entries load, entries from this club are labelled with the club's name, and entries from other clubs say "another club"

#### Scenario: No entries
- **WHEN** an active member has no entries
- **THEN** an empty state offers to log a metric

#### Scenario: Pending invitee
- **WHEN** a trainer opens the page of an athlete they invited who hasn't answered
- **THEN** the page says the invitation awaits confirmation, and offers no metrics or logging

#### Scenario: Not on the roster
- **WHEN** a trainer opens an athlete page for someone not on the club's roster
- **THEN** they see an "athlete not found" state

### Requirement: The trainer logs a metric entry
The "Log metric" dialog SHALL offer the active metrics for the athlete's sport and the general metrics, and SHALL take a value and a measured date no later than today in the trainer's time zone. A date of today SHALL be sent as the moment of saving, and an earlier date as midday of that day, so a valid date is never rejected as future. It SHALL describe the saved entry as trainer-reported and permanent, and SHALL offer no way to edit or delete an entry.

#### Scenario: Saving an entry
- **WHEN** a trainer logs a valid value for an active member
- **THEN** the entry is saved, and the summaries and entry list show it without a reload

#### Scenario: Today, ahead of UTC
- **WHEN** a trainer in a time zone ahead of UTC logs an entry dated today shortly after local midnight
- **THEN** the entry is accepted and shows today's date for that trainer

#### Scenario: Today, behind UTC
- **WHEN** a trainer in a time zone behind UTC logs an entry dated today late in the local evening
- **THEN** the entry is accepted and shows today's date for that trainer

#### Scenario: Invalid value or date
- **WHEN** the value isn't a number or the date is in the future
- **THEN** the dialog shows the error next to the field and sends nothing

#### Scenario: Membership ended meanwhile
- **WHEN** saving is rejected because the athlete's membership is no longer active
- **THEN** the dialog says the athlete is no longer an active member, and the page refreshes the athlete

### Requirement: The trainer decides certification requests
The certifications page SHALL list the club's pending requests (achievement title, organization, date, athlete's name), with Load more. Approving SHALL be confirmed in a dialog. Rejecting SHALL require a reason in its dialog. A decided request SHALL leave the list without a reload.

#### Scenario: Approve
- **WHEN** a trainer approves a request and confirms
- **THEN** the request leaves the queue and the page says it was certified

#### Scenario: Reject without a reason
- **WHEN** a trainer tries to reject with an empty reason
- **THEN** the dialog asks for a reason and sends nothing

#### Scenario: Decided or withdrawn meanwhile
- **WHEN** deciding fails because the request was already decided, withdrawn or cancelled
- **THEN** the dialog says the request is no longer pending, and the queue refreshes

#### Scenario: Athlete left the club meanwhile
- **WHEN** deciding is rejected because the athlete no longer has an active membership with the club, while the trainer still trains the club
- **THEN** the dialog says the athlete is no longer an active member, and the queue refreshes

#### Scenario: Empty queue
- **WHEN** the club has no pending requests
- **THEN** an empty state says there is nothing to review

### Requirement: Trainer pages show only what the trainer API returns
Trainer pages SHALL show no email, contact details, date of birth, age, private profile field or internal id, and SHALL NOT show the prototype's unsupported controls (dashboard counts, groups, sessions, attendance, exports, messages, staff invites, share links, evidence files or editing entries).

#### Scenario: Athlete page content
- **WHEN** a trainer opens any athlete page
- **THEN** only the athlete's public name, handle and sport, the membership status and the metric data appear
