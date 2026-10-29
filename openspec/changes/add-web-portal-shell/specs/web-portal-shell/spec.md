# Spec Delta

## Purpose

Defines how people sign in to the web portals, how their session reaches the API without ever being exposed to the browser, how the admin and trainer areas are guarded, and the baseline states every portal page shows, so that later web work builds on one consistent shell.

## ADDED Requirements

### Requirement: Web sign-in uses Magic Link with a code fallback
The web app SHALL offer sign-in only by email Magic Link with a one-time code fallback. It SHALL NOT offer password, Apple, or Google sign-in.

#### Scenario: Sign in by link
- **WHEN** a user enters their email and opens the Magic Link
- **THEN** they are signed in and returned to the portal page they were trying to reach

#### Scenario: Sign in by code
- **WHEN** a user enters the one-time code from the same email
- **THEN** they are signed in and returned to the portal page they were trying to reach

#### Scenario: Wrong or expired code
- **WHEN** a user enters a wrong or expired code
- **THEN** they stay on the sign-in page with a message to request a new code, and no session is created

### Requirement: Sessions are never readable by browser scripts
The web app SHALL keep the session only in httpOnly cookies set by the server, and SHALL NOT place an access or refresh token in browser storage, script-readable cookies, URLs, or page markup.

#### Scenario: Browser storage after sign-in
- **WHEN** a signed-in user inspects local storage, session storage, and script-readable cookies
- **THEN** no access or refresh token is present

#### Scenario: Sign out
- **WHEN** a user signs out
- **THEN** the session cookies are cleared and portal pages require sign-in again

### Requirement: Sessions are refreshed without losing cookies
The web app SHALL refresh an expiring session on the server during any request, and SHALL return the refreshed cookies on that request's response, including redirects and API responses.

#### Scenario: Expired access token
- **WHEN** a user whose access token has expired but whose refresh token is valid opens a portal page or calls the API
- **THEN** the request succeeds and the response carries the refreshed session cookies

### Requirement: Return paths stay on the site
The web app SHALL send a user back after sign-in only to a relative path on the same site, and SHALL ignore any other return target.

#### Scenario: External return target
- **WHEN** the sign-in page receives a return target that is an absolute URL or starts with `//`
- **THEN** after sign-in the user lands on the default page for their account, not the external target

### Requirement: Portal areas require sign-in
The web app SHALL send a visitor without a session who opens any `/admin` or `/trainer` page to the sign-in page with that page as the return target.

#### Scenario: Visitor opens the admin area
- **WHEN** a visitor without a session opens `/admin/clubs`
- **THEN** they are shown the sign-in page, and after signing in they return to `/admin/clubs`

### Requirement: Browser API calls carry the session only through the server
The web app SHALL send every API call from the browser to its own origin, which SHALL forward it to the API with the server-side session's access token. It SHALL preserve the request method, path, query string, and body, including batched calls, and SHALL NOT forward browser cookies to the API.

#### Scenario: Query
- **WHEN** a page runs an API query, alone or batched with other queries
- **THEN** the API receives the same procedure, input, and batch, authenticated as the signed-in user

#### Scenario: Mutation
- **WHEN** a page runs an API mutation, alone or batched
- **THEN** the API receives the same body, authenticated as the signed-in user

#### Scenario: No session
- **WHEN** an API call reaches the forwarder without a session
- **THEN** it is forwarded without credentials and the API answers as for an unauthenticated caller

#### Scenario: Cross-site mutation
- **WHEN** a mutation reaches the forwarder from another site's origin
- **THEN** it is rejected and nothing is forwarded

### Requirement: The admin area is shown only to admins
The web app SHALL show the `/admin` area only to a user the API recognizes as an admin, and SHALL show a "not authorized" page to any other signed-in user. Data access SHALL be enforced by the API regardless of what the page shows.

#### Scenario: Athlete opens the admin area
- **WHEN** a signed-in athlete or trainer opens `/admin`
- **THEN** they see the "not authorized" page and no admin data loads

#### Scenario: Admin opens the admin area
- **WHEN** an admin opens `/admin`
- **THEN** they see the admin shell with the clubs page

### Requirement: Portal pages show loading, empty, and error states
Every portal page SHALL show a distinct loading state, an empty state when there is no data, and an error state with a retry action when a request fails. Messages SHALL NOT include internal ids, stack traces, or server details.

#### Scenario: Request failure
- **WHEN** a portal page's data request fails
- **THEN** the page shows an error state with a retry action

#### Scenario: Session expired mid-use
- **WHEN** an API call returns unauthorized because the session can no longer be refreshed
- **THEN** the user is sent to the sign-in page with the current page as the return target

### Requirement: Portal pages are usable by keyboard and at desktop widths
Portal pages SHALL be operable by keyboard with a visible focus indicator, SHALL give dialogs a focus trap and Escape to close, and SHALL lay out without horizontal scrolling from 1024 px wide upward.

#### Scenario: Keyboard navigation
- **WHEN** a user moves through a portal page with the keyboard
- **THEN** every action is reachable and the focused element is visibly marked

#### Scenario: Dialog
- **WHEN** a confirmation dialog is open and the user presses Escape
- **THEN** the dialog closes without acting and focus returns to the control that opened it
