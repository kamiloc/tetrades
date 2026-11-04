# Spec Delta

## MODIFIED Requirements

### Requirement: The admin area is shown only to admins
The web app SHALL show the `/admin` area only to a user the API recognizes as an admin, and SHALL show a "not authorized" page to any other signed-in user. Data access SHALL be enforced by the API regardless of what the page shows.

#### Scenario: Athlete opens the admin area
- **WHEN** a signed-in athlete or trainer opens `/admin`
- **THEN** they see the "not authorized" page and no admin data loads

#### Scenario: Admin opens the admin area
- **WHEN** an admin opens `/admin`
- **THEN** they see the admin shell with the overview page

#### Scenario: Admin signs in
- **WHEN** an admin signs in without a return target
- **THEN** they land on the overview
