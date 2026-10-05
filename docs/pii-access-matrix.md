# PII Access Matrix

Trainer and club rows follow [ADR-013](adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md). They are enforced in the API services (`membership`, `metrics`, `visibility`) and, as defense in depth, in RLS (`supabase/policies/`).

## Roles

- Public Visitor
- Athlete
- Trainer (scoped per club through `ClubTrainer`; three cases: `ACTIVE` membership, pending membership, no membership)
- Support Admin (not an application role; break-glass only)
- API Server
- Job Worker

## Access principles

- Public Visitor gets L0 data the athlete's visibility settings allow.
- Athlete may access their own data.
- Trainer access exists only through an `ACTIVE` `ClubMembership` between the athlete and the trainer's club. It never extends to L2 data.
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

- Athlete: read own; confirm or decline invitations
- Trainer: invite for their own club; cannot activate a membership without athlete confirmation
- Public Visitor: only `ACTIVE` memberships the athlete's visibility allows; pending memberships are never visible

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
