# Spec Delta

## MODIFIED Requirements

### Requirement: Every tab presents loading, error, empty, and loaded states
Each tab SHALL pick its state in this order: loading while its data is being fetched, error when the fetch fails, empty when it has no data, and loaded otherwise. The screen header SHALL stay visible in every state. Empty and error copy (subtitle, panel title, body, and action labels) SHALL match the handoff `TAB_STATES` meaning in the automatically selected language. Loaded subtitles SHALL follow the handoff format but use live values, never the handoff's sample counts or names.

#### Scenario: Fetch in progress
- **WHEN** a tab's data has not loaded yet
- **THEN** the tab shows its skeleton under the header

#### Scenario: Fetch fails
- **WHEN** a tab's query returns an error
- **THEN** the tab shows its localized error panel
- **AND** the error message from the server is not shown verbatim

#### Scenario: No data
- **WHEN** a tab's query succeeds with no data
- **THEN** the tab shows its localized empty panel and actions

#### Scenario: Loaded subtitle uses live values
- **WHEN** the Clubs tab loads with 1 active club and 2 pending invitations
- **THEN** the subtitle reflects 1 active club and 2 invitations in the selected language, not the handoff sample "2 active clubs · 1 invitation"

### Requirement: Sign-in offers only Magic Link with OTP fallback
The sign-in screen SHALL follow the handoff's dark layout and SHALL present its copy in the automatically selected language. It SHALL offer email sign-in only: a Magic Link with OTP fallback. It SHALL NOT offer Apple, Google, or password sign-in.

#### Scenario: Athlete signs in with email
- **WHEN** the athlete enters an email and continues
- **THEN** a Magic Link is sent and the OTP verification screen is offered in the selected language

#### Scenario: No third-party providers
- **WHEN** the sign-in screen is shown
- **THEN** no Apple or Google sign-in control is present

#### Scenario: Sign-in failure
- **WHEN** the sign-in request fails
- **THEN** an inline banner shows the failure message in the selected language
