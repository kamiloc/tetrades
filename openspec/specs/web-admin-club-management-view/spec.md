# web-admin-club-management-view Specification

## Purpose

Defines how a platform admin manages clubs and their trainers in the web console, so that every admin capability of the API is reachable through clear, confirmed actions that never suggest access the admin role does not have.

## Requirements

### Requirement: Admin lands on the club list
The club list (`/admin/clubs`) SHALL show clubs newest first, with each club's name, city, country, active or deactivated status, and active trainer count. It SHALL offer filters for Active, Deactivated, and All, a "No active trainer" filter, a search box matching name or slug, and a control to load more. The admin area itself opens on the overview.

#### Scenario: Open the console
- **WHEN** an admin opens `/admin`
- **THEN** they see the overview, which links to the club list

#### Scenario: Open the club list
- **WHEN** an admin opens `/admin/clubs`
- **THEN** they see the club list filtered to Active

#### Scenario: No clubs
- **WHEN** no club matches the filter
- **THEN** the list shows an empty state with an action to create a club

#### Scenario: More than one page
- **WHEN** more clubs exist than the first page shows
- **THEN** a load-more control fetches the next page and appends it

#### Scenario: Search
- **WHEN** an admin types at least two characters in the search box
- **THEN** the list shows only matching clubs within the selected filter, and the search is kept in the page address

#### Scenario: Clubs without a trainer
- **WHEN** an admin turns on "No active trainer"
- **THEN** only clubs with no active trainer are listed within the selected filter, and the choice is kept in the page address

#### Scenario: No match
- **WHEN** a search matches no club
- **THEN** the list says no club matches and offers to clear the search

### Requirement: Admin creates a club
The admin area SHALL let an admin create a club with name, slug, country, and optional city, and SHALL explain that the slug cannot be changed later.

#### Scenario: Created
- **WHEN** an admin submits a valid new club
- **THEN** the club appears in the list as Active

#### Scenario: Slug taken
- **WHEN** an admin submits a slug that is already used
- **THEN** the form stays open with a message that the slug is taken, and nothing is created

#### Scenario: Invalid fields
- **WHEN** an admin submits a missing name or an invalid slug or country
- **THEN** each invalid field shows its own message and nothing is sent until they are fixed

### Requirement: Admin edits a club
The admin area SHALL let an admin change a club's name, country, and city, and SHALL show the slug as read-only.

#### Scenario: Edit details
- **WHEN** an admin saves a new name and city
- **THEN** the club shows the new values and the same slug

### Requirement: Admin deactivates and reactivates a club with confirmation
The admin area SHALL ask for confirmation before deactivating a club, stating that trainers lose access and that pending certification requests, athlete invitations, and trainer invitations are cancelled. After deactivation it SHALL show how many of each were cancelled. Reactivation SHALL state that cancelled items stay cancelled.

#### Scenario: Deactivate
- **WHEN** an admin confirms deactivation of a club with open items
- **THEN** the club shows as Deactivated and the result lists the cancelled counts

#### Scenario: Cancel the dialog
- **WHEN** an admin closes the deactivation dialog without confirming
- **THEN** nothing changes

#### Scenario: Reactivate
- **WHEN** an admin confirms reactivation
- **THEN** the club shows as Active and the confirmation had stated that cancelled items stay cancelled

### Requirement: Admin sees a club's trainers and invitations
The admin area SHALL show, for one club, its trainers (active and revoked) and its trainer invitations with their state (pending, expired, accepted, declined, revoked). A trainer SHALL be labelled with the address they were invited with ("Invited as …"), or as provisioned before invitations when there is none.

#### Scenario: Mixed trainers
- **WHEN** a club has an active trainer, a revoked trainer, and a trainer provisioned before invitations
- **THEN** each is listed with its status, the first two labelled "Invited as" their address and the third labelled as provisioned before invitations

#### Scenario: Expired invitation
- **WHEN** a pending invitation is past its expiry
- **THEN** it is shown as Expired, not Pending

### Requirement: Admin invites a trainer and is told what to pass on
The admin area SHALL let an admin invite an email to the club. On success it SHALL tell the admin that no email is sent, and that the invitee must sign in on the trainer invitations page with that exact address before the expiry date, with a way to copy the page link.

#### Scenario: Invite sent
- **WHEN** an admin invites a new email
- **THEN** the invitation appears as Pending and the admin sees the instructions with the expiry date and a copy-link action

#### Scenario: Duplicate
- **WHEN** an admin invites an email that already has a pending invitation for the club, or is already a trainer
- **THEN** a message explains the conflict and nothing is created

#### Scenario: Deactivated club
- **WHEN** the club is deactivated
- **THEN** the invite action is unavailable and the page explains that the club must be reactivated first

### Requirement: Admin revokes invitations and trainers with confirmation
The admin area SHALL ask for confirmation before revoking a pending invitation or a trainer. Revoking a trainer SHALL state that their access to this club ends at once and that their past entries and decisions stay on record.

#### Scenario: Revoke a trainer
- **WHEN** an admin confirms revoking a trainer
- **THEN** the trainer shows as Revoked

#### Scenario: Revoke a pending invitation
- **WHEN** an admin confirms revoking a pending invitation
- **THEN** the invitation shows as Revoked

### Requirement: The console reflects each change without a reload
The admin area SHALL, after any successful create, edit, deactivate, reactivate, invite, or revoke, update every affected list, detail, count, and status on screen without the admin reloading the page.

#### Scenario: Deactivate from the detail page
- **WHEN** an admin deactivates a club and then returns to the club list
- **THEN** the club shows as Deactivated under the current filter without a reload

#### Scenario: Invite and revoke
- **WHEN** an admin invites a trainer and later revokes that invitation
- **THEN** the invitations table shows the new Pending row and then the Revoked state without a reload

#### Scenario: Trainer count
- **WHEN** an admin revokes a club's only active trainer
- **THEN** the club's active trainer count in the list shows 0 without a reload

### Requirement: The console shows no athlete data or unsupported controls
The admin area SHALL NOT display athlete records, metrics, certification requests, the security audit log, documents, or trainer permission controls, and SHALL NOT offer actions the API does not support. The admin activity log and club search are supported surfaces.

#### Scenario: Prototype-only surfaces
- **WHEN** an admin uses the console
- **THEN** there is no approval queue, document review, permission toggle, global search across athletes, or export

#### Scenario: Activity is the admin action log
- **WHEN** an admin opens the activity page
- **THEN** it shows only admin actions on clubs and trainer access, not athlete activity or security audit events
