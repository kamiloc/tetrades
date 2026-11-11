# Spec Delta

## MODIFIED Requirements

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

### Requirement: The console shows no athlete data or unsupported controls
The admin area SHALL NOT display athlete records, metrics, certification requests, the security audit log, documents, or trainer permission controls, and SHALL NOT offer actions the API does not support. The admin activity log and club search are supported surfaces.

#### Scenario: Prototype-only surfaces
- **WHEN** an admin uses the console
- **THEN** there is no approval queue, document review, permission toggle, global search across athletes, or export

#### Scenario: Activity is the admin action log
- **WHEN** an admin opens the activity page
- **THEN** it shows only admin actions on clubs and trainer access, not athlete activity or security audit events
