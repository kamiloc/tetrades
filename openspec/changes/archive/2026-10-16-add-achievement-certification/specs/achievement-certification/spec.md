# Spec Delta

## Purpose

Lets an athlete get an achievement certified by a trainer of a club the athlete belongs to, so that a verified achievement always means an attributable club vouched for it, with the athlete's consent.

## ADDED Requirements

### Requirement: Athlete requests certification from an active club
The system SHALL let an athlete request certification of one of their own achievements from a club with which they have an `ACTIVE` membership. The request starts `PENDING` and the achievement's verification status becomes `PENDING`.

#### Scenario: Request to an active club
- **WHEN** an athlete with an `ACTIVE` membership in club A requests certification of their `UNVERIFIED` achievement from club A
- **THEN** a `PENDING` request for that achievement and club A exists, and the achievement's verification status is `PENDING`

#### Scenario: Club without an active membership
- **WHEN** an athlete requests certification from a club where their membership is `PENDING_ATHLETE_CONFIRMATION`, `COMPLETED`, or `REJECTED`, or where they have no membership
- **THEN** the request is rejected as forbidden and nothing is stored

#### Scenario: Another athlete's achievement
- **WHEN** an athlete requests certification of an achievement that belongs to a different athlete
- **THEN** the request is rejected as forbidden and nothing is stored

#### Scenario: Unknown achievement
- **WHEN** an athlete requests certification of an achievement that does not exist
- **THEN** the request fails as not found

#### Scenario: Already verified
- **WHEN** an athlete requests certification of an achievement that is already `VERIFIED`
- **THEN** the request is rejected as invalid and nothing is stored

### Requirement: One open request per achievement
The system SHALL allow at most one `PENDING` certification request per achievement at any time.

#### Scenario: Second request while one is open
- **WHEN** an athlete requests certification of an achievement that already has a `PENDING` request, from the same or a different club
- **THEN** the request is rejected as a conflict and the existing request is unchanged

### Requirement: A trainer of the chosen club decides
The system SHALL let only a trainer of the club named in a `PENDING` request approve or reject it. Approval makes the achievement `VERIFIED`. Rejection requires a reason and makes the achievement `REJECTED`. Each decision records the deciding trainer and the time.

#### Scenario: Trainer approves
- **WHEN** a trainer of club A approves a `PENDING` request made to club A
- **THEN** the request is `APPROVED` with the deciding trainer and time recorded, and the achievement is `VERIFIED`

#### Scenario: Trainer rejects with a reason
- **WHEN** a trainer of club A rejects a `PENDING` request made to club A and gives a reason
- **THEN** the request is `REJECTED` with the reason, deciding trainer, and time recorded, and the achievement is `REJECTED`

#### Scenario: Rejection without a reason
- **WHEN** a trainer rejects a request without a reason
- **THEN** the request is rejected as invalid input and nothing changes

#### Scenario: Trainer of another club
- **WHEN** a trainer of club B attempts to decide a request made to club A
- **THEN** the request is rejected as forbidden and nothing changes

#### Scenario: User who trains no club
- **WHEN** a user with no club trainer record attempts to decide any request
- **THEN** the request is rejected as forbidden

#### Scenario: Request no longer pending
- **WHEN** a trainer attempts to decide a request that is `APPROVED`, `REJECTED`, or `CANCELLED`
- **THEN** the request is rejected as invalid and nothing changes

### Requirement: Decisions require an active membership at decision time
The system SHALL accept a trainer's decision only while the athlete still has an `ACTIVE` membership with the request's club.

#### Scenario: Membership ended before the decision
- **WHEN** a trainer decides a request whose athlete's membership with the club is no longer `ACTIVE`
- **THEN** the decision is rejected as forbidden and the achievement is not verified

### Requirement: Athlete can withdraw a pending request
The system SHALL let the athlete who made a `PENDING` request withdraw it, making the request `CANCELLED` and the achievement `UNVERIFIED`. No one else can withdraw it.

#### Scenario: Athlete withdraws
- **WHEN** the athlete withdraws their `PENDING` request
- **THEN** the request is `CANCELLED` and the achievement is `UNVERIFIED`

#### Scenario: Someone else withdraws
- **WHEN** a trainer or a different athlete attempts to withdraw the request
- **THEN** the request is rejected as forbidden and nothing changes

### Requirement: Leaving a club cancels its open requests
The system SHALL cancel every `PENDING` certification request made to a club when the athlete's membership with that club leaves `ACTIVE`, in the same operation, returning those achievements to `UNVERIFIED`.

#### Scenario: Athlete leaves with an open request
- **WHEN** an athlete with a `PENDING` request to club A leaves club A
- **THEN** the membership is `COMPLETED`, the request is `CANCELLED`, and the achievement is `UNVERIFIED`

### Requirement: Certifications outlive the membership
The system SHALL keep an achievement `VERIFIED`, with its certifying club, after the athlete's membership with that club ends.

#### Scenario: Athlete leaves after certification
- **WHEN** an athlete leaves a club that certified one of their achievements
- **THEN** the achievement remains `VERIFIED` and still names the certifying club

### Requirement: Athlete can request again after a rejection or cancellation
The system SHALL let an athlete request certification again, from any club where they have an `ACTIVE` membership, for an achievement whose previous request was `REJECTED` or `CANCELLED`. Earlier requests are kept unchanged.

#### Scenario: New request after rejection
- **WHEN** an athlete whose request to club A was rejected requests certification from club B, where they are `ACTIVE`
- **THEN** a new `PENDING` request to club B exists and the rejected request to club A is unchanged

### Requirement: Trainers see only pending requests made to their club
The system SHALL let a trainer list only the `PENDING` requests made to a club they train, most recent first, in pages of 20 by default and at most 50. Each item shows the achievement's title, organization, and date and the athlete's public identity, and no private profile data.

#### Scenario: Trainer lists their club's queue
- **WHEN** a trainer of club A lists pending requests for club A
- **THEN** only `PENDING` requests made to club A are returned, each with the achievement details and the athlete's public identity

#### Scenario: Trainer lists another club's queue
- **WHEN** a trainer of club A lists pending requests for club B
- **THEN** the request is rejected as forbidden

#### Scenario: Decided requests leave the queue
- **WHEN** a request to club A is approved, rejected, or cancelled
- **THEN** it no longer appears in club A's pending list

#### Scenario: Page size above the maximum
- **WHEN** a trainer requests a page of more than 50 requests
- **THEN** the request is rejected as invalid input

### Requirement: Athlete sees their own requests and rejection reasons
The system SHALL let an athlete list their own certification requests in every status, including the club and any rejection reason. Requests and rejection reasons SHALL NOT be returned to anyone other than the athlete.

#### Scenario: Athlete reads a rejection
- **WHEN** an athlete lists their requests after one was rejected
- **THEN** the rejected request is returned with its club and reason

#### Scenario: Another user reads the athlete's requests
- **WHEN** any other athlete, an anonymous caller, or a trainer of a different club attempts to read the athlete's requests
- **THEN** no request or rejection reason is returned

### Requirement: Only certification changes verification status
The system SHALL change an achievement's verification status only through the certification flow. A newly added achievement SHALL start `UNVERIFIED`. No end user SHALL set or change verification status or evidence directly, through the API or the database.

#### Scenario: New achievement
- **WHEN** an athlete adds an achievement
- **THEN** its verification status is `UNVERIFIED`

#### Scenario: Direct insert as verified
- **WHEN** an athlete writes an achievement directly to the database with status `VERIFIED`
- **THEN** the write is rejected

#### Scenario: Direct status change
- **WHEN** an athlete directly updates the verification status or verification evidence of their own achievement
- **THEN** the write is rejected and the status is unchanged

#### Scenario: Editing a verified achievement
- **WHEN** an athlete directly changes the title, organization, or date of a `VERIFIED` achievement
- **THEN** the change is stored and the achievement becomes `UNVERIFIED`
