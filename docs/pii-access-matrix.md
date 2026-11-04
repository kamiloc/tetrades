# PII Access Matrix

Trainer and club rows follow [ADR-013](adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md); achievement visibility follows [ADR-014](adr/014-achievement-visibility-default.md); achievement certification follows [ADR-016](adr/016-achievement-certification-by-club-trainers.md); the platform admin, trainer provisioning and the club lifecycle follow [ADR-017](adr/017-platform-admin-trainer-provisioning-and-club-lifecycle.md). They are enforced in the API services (`membership`, `metrics`, `visibility`) and, as defense in depth, in RLS (`supabase/policies/`).

## Roles

- Public Visitor
- Athlete
- Trainer (scoped per club through a non-revoked `ClubTrainer` row of an active club; three cases: `ACTIVE` membership, pending membership, no membership). A revoked trainer, or any trainer of a deactivated club, has no trainer access (ADR-017).
- Platform Admin (`UserRole.ADMIN`, set only by the project owner; manages clubs and trainer access only, ADR-017)
- Support Admin (not an application role; break-glass only)
- API Server
- Job Worker

## Access principles

- Public Visitor gets L0 data the athlete's visibility settings allow.
- Athlete may access their own data.
- Trainer access exists only through an `ACTIVE` `ClubMembership` between the athlete and the trainer's club. It never extends to L2 data.
- Platform Admin acts on clubs, trainer invitations and trainer assignments only. Everywhere else a Platform Admin is treated exactly like any other non-owner, and never gets L2 data, private profiles, metric entries, certification requests, visibility settings, legal holds or `audit_log`.
- An account holds one capacity: athlete, trainer or admin (ADR-017 §3).
- Support Admin has no default right to restricted data; any exceptional access requires break-glass handling.
- API Server and Job Worker use least privilege and only for the workflow they are executing.
- Visibility filtering applies equally to list and detail endpoints.

## Matrix

### Public athlete profile (L0)

- Public Visitor: allow what visibility settings permit
- Athlete: allow own
- Trainer: allow what visibility settings permit
- Support Admin: allow
- API Server: allow
- Job Worker: usually not needed

### Athlete achievements (L0)

Audience-controlled by `achievementsAudience`, which defaults to `PUBLIC` when unset (ADR-014). Non-owners only ever see `VERIFIED` achievements, and only public fields (`id`, `title`, `organization`, `achievedOn`, `verificationStatus`, `certifyingClub`). The certifying club's name is shown to a non-owner only when the club-memberships audience also admits them (ADR-016).

| Actor / state                                         | Read                                  | Write |
| ----------------------------------------------------- | ------------------------------------- | ----- |
| Athlete (own)                                         | allow, every verification status, always with the certifying club | allow own title/organization/date; verification status and source are changed only by the certification flow (DB trigger) |
| Other athlete with an `ACCEPTED` connection           | `VERIFIED` only, if audience is `CONNECTIONS` or `PUBLIC` | deny |
| Other athlete without a connection                    | `VERIFIED` only, if audience is `PUBLIC` | deny |
| Public Visitor (anonymous)                            | `VERIFIED` only, if audience is `PUBLIC` | deny |
| Trainer (any membership state)                        | same as any other athlete or visitor; no club-based access to the list (a pending certification request is a separate surface, below) | deny |
| API Server                                            | through `achievement.listAchievements` with the visibility filter | verification status only through the certification service |
| Job Worker (`deletePII`)                              | —                                     | delete |

RLS SELECT on `athlete_achievements` is owner-only; audience filtering is enforced in the API visibility service.

### Achievement certification requests (L1; `club_id` L0)

Requests flow from an athlete to one club where they are `ACTIVE`; a trainer of that club decides (ADR-016).

| Actor / state                                         | Read                                  | Write |
| ----------------------------------------------------- | ------------------------------------- | ----- |
| Athlete (own achievements)                            | allow, every status, including rejection reasons | request (`ACTIVE` club only), withdraw own `PENDING` |
| Trainer of the request's club, request `PENDING`      | the request: achievement title, organization, date, athlete L0 identity | approve, or reject with a reason, while the athlete's membership is `ACTIVE` |
| Trainer of the request's club, request decided or cancelled | deny                            | deny |
| Trainer of another club / no club                     | deny                                  | deny |
| Other athlete / Public Visitor                        | deny (they see only the certifying club name, per the rule above) | deny |
| API Server                                            | through the `achievement` certification procedures | all writes (no client write policies) |
| Job Worker (`notifications`)                          | ids only in payloads                  | — |
| Job Worker (`deletePII`)                              | —                                     | delete |

### Private athlete profile (`AthletePrivateProfile`, L2)

- Public Visitor: deny
- Athlete: allow own
- **Trainer: deny in every membership state (ACTIVE, pending, none)**
- Support Admin: deny by default / break-glass only
- API Server: allow only through protected procedures
- Job Worker: deny unless a job explicitly requires it (for example `deletePII`)

### Athlete metric entries (L1)

| Actor / state                                         | Read                                  | Write |
| ----------------------------------------------------- | ------------------------------------- | ----- |
| Athlete (own)                                         | allow                                 | deny (trainer-reported only) |
| Trainer, `ACTIVE` membership with their club          | allow                                 | allow |
| Trainer, `PENDING_ATHLETE_CONFIRMATION` membership    | deny                                  | deny |
| Trainer, `COMPLETED` or `REJECTED` membership         | deny (access ends with `ACTIVE`)      | deny |
| Trainer, no membership (or another club's athlete)    | deny                                  | deny |
| Other athlete with an `ACCEPTED` connection           | allow only if visibility is `CONNECTIONS` or `PUBLIC` | deny |
| Public Visitor                                        | allow only if visibility is `PUBLIC`  | deny |
| API Server / Job Worker                               | through procedures with the visibility filter / summary derivation | summary derivation only; `deletePII` deletes |

Summaries (`AthleteMetricSummary`) aggregate every club, so the active-club trainer exception does not apply: they follow the audience rule only.

### Club membership (L0/L1)

- Athlete: read own; confirm or decline invitations; leave an `ACTIVE` membership, also of a deactivated club
- Trainer: invite for their own active club; cannot activate a membership without athlete confirmation
- API Server (club deactivation): closes the club's pending invitations as `REJECTED` (ADR-017 amends ADR-013 §5)
- Public Visitor: only `ACTIVE` memberships the athlete's visibility allows; pending memberships are never visible

### Clubs (L0; `deactivated_at`, `created_at` L1)

| Actor                                   | Read                                                     | Write |
| --------------------------------------- | -------------------------------------------------------- | ----- |
| Public Visitor / Athlete / Trainer      | L0 fields plus the derived `isActive`, through the API; direct client reads limited to `id, slug, name, country_code, city` by column grants | deny |
| Platform Admin                          | every field, plus the active trainer count               | create; edit name, country, city (never the slug); deactivate; reactivate. Never delete |
| API Server                              | allow                                                    | admin router only; deactivation cascade |

### Trainer invitations (`ClubTrainerInvitation`, L1)

| Actor                                   | Read                                                     | Write |
| --------------------------------------- | -------------------------------------------------------- | ----- |
| Platform Admin                          | a club's invitations with their derived state and the invited email (null once redacted) | invite; revoke `PENDING` |
| Invitee (confirmed session email matches) | own `PENDING`, unexpired invitations to active clubs, through the API | accept (not as an athlete, admin or system account; not with an invitation created before the trainer's last revocation), decline |
| Anyone else, including an unconfirmed email | deny (`NOT_FOUND`)                                   | deny |
| Any client, direct database read        | deny (no client policies or privileges)                  | deny |
| Job Worker (`trainer-invitation-redaction`) | ids and dates                                        | redact emails 90 days after the invitation ends |
| API Server (trainer restored by a new invitation) | the person's earlier accepted invitations to that club | redact them at once (superseded) |
| Job Worker (`deletePII`)                | invitations to the deleted athlete's confirmed email     | revoke and redact |

### Trainer assignments (`ClubTrainer`, L1)

- Platform Admin: list a club's trainers (status, dates, the originally invited email); revoke. Rows are never deleted.
- Trainer: read own rows through RLS, revoked ones included.
- Invitee: a row is created, or a revoked one restored, by accepting an invitation.

### Admin action log (`admin_action_log`, L1)

- API Server: insert, in the same transaction as each successful admin write (ids, counts, field names; never an email or L2)
- Every client, Platform Admin included: deny (no client policies or privileges)
- Project owner: database access only

### Visibility settings (L1)

- Athlete: read and write own
- Trainer / Public Visitor: deny (they see only the effect, not the settings)
- API Server: read to apply filtering

### Device tokens (L1)

- Account owner: register, refresh, and remove own
- Trainer / other users / Public Visitor: deny
- Job Worker (`notifications`): read to deliver; delete tokens Expo reports as unregistered
- Job Worker (`deletePII`): delete

## Break-glass rule

If Support Admin access to L2-CONFIDENTIAL data is ever required:

1. purpose must be declared
2. access must be time-scoped
3. audit event is mandatory
4. the access path is a database-level operation approved by the project owner; it is never an application endpoint, role, or procedure, and never exists for trainers or clubs
