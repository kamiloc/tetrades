# mobile-visibility-settings Specification

## Purpose

Lets the athlete view and change who can see their achievements, club memberships, and metrics from the mobile app, using the audiences and defaults from ADR-013 and ADR-014.

## Requirements

### Requirement: Three independent audience controls
The visibility settings screen SHALL show three controls: achievements, club memberships, and performance metrics. Each control SHALL offer exactly Private, Connections, and Public, and SHALL show the setting the server currently returns.

#### Scenario: Opening settings
- **WHEN** the athlete opens visibility settings
- **THEN** three controls are shown, each with Private, Connections, and Public, and the server's current values are selected

### Requirement: Category defaults are visible
Each control SHALL show its default beside it: Public for achievements, and Private for club memberships and metrics.

#### Scenario: New athlete
- **WHEN** an athlete who has never saved settings opens the screen
- **THEN** achievements shows Public, and club memberships and metrics show Private
- **AND** each control shows its default label

### Requirement: Changing one audience updates only that category
Changing a control SHALL send only that category's new audience. The screen SHALL show the saved value from the server's response, and SHALL restore the previous value if the update fails.

#### Scenario: Make metrics visible to connections
- **WHEN** the athlete selects Connections for metrics
- **THEN** only the metrics audience is sent, and the control shows Connections after the server confirms

#### Scenario: Update fails
- **WHEN** the update request fails
- **THEN** the control returns to its previous value and a user-facing error is shown

### Requirement: Visibility settings are reachable from the screens they affect
Visibility settings SHALL be reachable from the Profile tab and from the "Manage visibility" actions on the Performance and Clubs tabs.

#### Scenario: From Performance empty state
- **WHEN** the athlete taps "Manage visibility" on the Performance empty panel
- **THEN** the visibility settings screen opens
