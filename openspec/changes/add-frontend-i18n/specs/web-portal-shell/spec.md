# Spec Delta

## ADDED Requirements

### Requirement: Web portal language follows the browser locale
The web portal SHALL render all portal copy in the automatically selected supported language and set the document language metadata to match.

#### Scenario: Spanish browser opens a portal
- **WHEN** a user with a Spanish browser locale opens a web portal page
- **THEN** the page renders Spanish copy and identifies its document language as Spanish

#### Scenario: Unsupported browser language opens a portal
- **WHEN** a user with an unsupported browser language opens a web portal page
- **THEN** the page renders English copy and identifies its document language as English
