# Spec Delta

## Purpose

Defines how a platform admin sees the platform as a whole on the web: an overview of clubs, trainers and invitations, a trainer directory across clubs, and the log of admin actions. Every page shows only what the admin API returns.

## ADDED Requirements

### Requirement: The overview summarizes clubs, trainers and invitations
The overview (`/admin`) SHALL show these counts:
- active and deactivated clubs
- active clubs with no active trainer
- active trainers
- pending trainer invitations, and those expiring within 48 hours

It SHALL also show the five most recent admin actions and when the counts were generated. These counts SHALL link to their filtered lists:
- active clubs: the Active club list
- deactivated clubs: the Deactivated club list
- active clubs with no active trainer: the Active club list with "No active trainer" on
- active trainers: the trainer directory filtered to Active

The two invitation counts SHALL NOT be links, since no cross-club invitation list exists.

#### Scenario: Open the overview
- **WHEN** an admin opens `/admin`
- **THEN** the counts and the five most recent actions load

#### Scenario: Count links
- **WHEN** an admin selects the deactivated clubs count
- **THEN** the club list opens filtered to Deactivated

#### Scenario: Clubs without a trainer link
- **WHEN** an admin selects the count of active clubs with no active trainer
- **THEN** the club list opens filtered to Active with "No active trainer" on, listing exactly the clubs counted, unless they changed in between

#### Scenario: Invitation counts
- **WHEN** an admin views the pending and expiring invitation counts
- **THEN** they are shown as plain numbers with no link

#### Scenario: Nothing yet
- **WHEN** there are no clubs and no actions
- **THEN** the counts show zero, and the recent actions area offers to create a club

#### Scenario: Counts fail to load
- **WHEN** the overview request fails
- **THEN** a retryable error state is shown

### Requirement: The trainer directory lists trainers across clubs
The trainer directory (`/admin/trainers`) SHALL list trainer assignments across clubs, newest first, with Load more. Each row SHALL show the club, the "Invited as" email (or "Provisioned before invitations" when there is none), the access state and the dates. Access shows as Active, Revoked, or "Club deactivated" (with the club marked deactivated), never as Active for a deactivated club. The page SHALL offer an access filter (Active, Club deactivated, Revoked, All; Active by default) and a club name search, and SHALL link each row to its club's trainers page.

#### Scenario: Open the directory
- **WHEN** an admin opens `/admin/trainers`
- **THEN** active trainers from every club are listed

#### Scenario: Trainer at a deactivated club
- **WHEN** a non-revoked trainer belongs to a deactivated club
- **THEN** the row shows "Club deactivated", not Active, and the club is marked deactivated

#### Scenario: Search by club
- **WHEN** an admin types at least two characters of a club name
- **THEN** only trainers of matching clubs are listed

#### Scenario: Go to the club
- **WHEN** an admin selects a row
- **THEN** that club's trainers page opens, where revoking happens

#### Scenario: Empty
- **WHEN** no trainer matches the filters
- **THEN** an empty state is shown

### Requirement: The activity page shows the admin action log
The activity page (`/admin/activity`) SHALL list admin actions newest first, with Load more. Each entry SHALL show:
- the action in plain words
- its club, linked
- who acted: "You", the acting admin's email, or "An admin" when the email is unavailable
- the time
- the recorded details: changed field names for an edit, and cancelled counts for a deactivation

It SHALL offer filters by action and by club, kept in the page address.

#### Scenario: Open the activity page
- **WHEN** an admin opens `/admin/activity`
- **THEN** the latest actions from every admin are listed

#### Scenario: From a club
- **WHEN** an admin follows "View activity" on a club's detail page
- **THEN** the activity page opens filtered to that club

#### Scenario: Unknown actor email
- **WHEN** an entry has no actor email and wasn't made by the viewer
- **THEN** it shows "An admin"

#### Scenario: Empty
- **WHEN** no action matches the filters
- **THEN** an empty state is shown

### Requirement: Insight pages stay current
After a club or trainer action in the console, the overview, the directory and the activity page SHALL show the change the next time they are displayed, without a reload.

#### Scenario: Deactivate then open the overview
- **WHEN** an admin deactivates a club and then opens the overview
- **THEN** the counts and recent actions include the deactivation

### Requirement: The admin navigation reaches every admin page
The admin sidebar SHALL list Overview, Clubs, Trainers and Activity, and SHALL mark the current page.

#### Scenario: Navigate
- **WHEN** an admin selects Trainers in the sidebar
- **THEN** the trainer directory opens and Trainers is marked current
