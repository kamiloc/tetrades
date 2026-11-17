# Spec Delta

## MODIFIED Requirements

### Requirement: Admin authority is limited to clubs and trainer access
The system SHALL limit admins to creating, editing, deactivating, and reactivating clubs, to inviting and revoking trainers, and to reading club, trainer-assignment and trainer-invitation data, platform overview counts, and the admin action log. Admins SHALL NOT read or write L2-CONFIDENTIAL data, private profiles, athlete records beyond what other users may see, metric entries, certification requests, visibility settings, legal holds, or the security audit log.

#### Scenario: Admin requests athlete private data
- **WHEN** an admin requests an athlete's private profile or any L2 field
- **THEN** the request is denied exactly as it would be for any other non-owner

#### Scenario: Admin attempts a legal hold
- **WHEN** an admin attempts to set or clear an athlete's legal hold
- **THEN** no procedure exists for it and the hold is unchanged

#### Scenario: Admin reads the security audit log
- **WHEN** an admin attempts to read another user's security audit events
- **THEN** the request is denied

#### Scenario: Admin reads the admin action log
- **WHEN** an admin reads the admin action log through the admin API
- **THEN** the records are returned, without request ids or internal actor ids

#### Scenario: Overview contains no athlete data
- **WHEN** an admin reads the platform overview
- **THEN** it contains club, trainer and invitation counts only, and no athlete count or record

### Requirement: The admin action log is written only by the API and never by clients
The system SHALL insert admin action records only through the API's own database connection. Client database roles (anonymous and authenticated users) SHALL NOT be able to read, insert, update, or delete them. Admins SHALL read them only through the admin API, which checks the admin role on every call.

#### Scenario: Client reads the log
- **WHEN** any authenticated user, including an admin, queries the admin action log directly
- **THEN** no rows are returned

#### Scenario: Client write attempt
- **WHEN** any client attempts to insert, update, or delete an admin action record
- **THEN** the attempt is denied and no record is created or changed

#### Scenario: Admin reads through the API
- **WHEN** an admin lists admin actions through the admin API
- **THEN** the records are returned

#### Scenario: Non-admin reads through the API
- **WHEN** a non-admin calls the admin API to list admin actions
- **THEN** the request is rejected as forbidden

#### Scenario: No update or delete through the API
- **WHEN** any user looks for a way to change or delete an admin action record through the API
- **THEN** no such operation exists
