# Spec Delta

## MODIFIED Requirements

### Requirement: Admins list clubs
The system SHALL let an admin list clubs, newest first, with cursor pagination (default 20, maximum 50), optionally filtered to active or deactivated clubs, optionally narrowed by a search of 2 to 100 characters matching the club's name or slug, case-insensitively, and optionally narrowed to clubs with no active (non-revoked) trainer. Each entry includes whether the club is active and its count of active trainers.

#### Scenario: Filter to deactivated clubs
- **WHEN** an admin lists clubs filtered to deactivated
- **THEN** only deactivated clubs are returned

#### Scenario: Page size limit
- **WHEN** an admin requests more than 50 clubs in one page
- **THEN** the request is rejected as invalid

#### Scenario: Search by name or slug
- **WHEN** an admin lists clubs with a search
- **THEN** only clubs whose name or slug contains the search, ignoring case, are returned, still filtered by status

#### Scenario: Clubs without an active trainer
- **WHEN** an admin lists active clubs narrowed to clubs with no active trainer
- **THEN** only active clubs whose trainer assignments are all revoked, or that have none, are returned, and their number matches the overview's count for the same moment

#### Scenario: Search too short
- **WHEN** an admin lists clubs with a one-character search
- **THEN** the request is rejected as invalid
