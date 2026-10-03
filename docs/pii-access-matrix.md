# PII Access Matrix

Trainer and club rows describe the planned pivot model ([ADR-013](adr/013-pivot-clubs-metrics-trainer-portal-and-visibility.md)); they are not yet implemented.

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

### Athlete metric entries (L1, planned)

| Actor / state                                         | Read                                  | Write |
| ----------------------------------------------------- | ------------------------------------- | ----- |
| Athlete (own)                                         | allow                                 | deny (trainer-reported only) |
| Trainer, `ACTIVE` membership with their club          | allow                                 | allow |
| Trainer, `PENDING_ATHLETE_CONFIRMATION` membership    | deny                                  | deny |
| Trainer, no membership (or another club's athlete)    | deny                                  | deny |
| Public Visitor                                        | allow only if visibility permits      | deny |
| API Server / Job Worker                               | through protected procedures / summary derivation | summary derivation only |

### Club membership (L0/L1, planned)

- Athlete: read own; confirm or decline invitations
- Trainer: invite for their own club; cannot activate a membership without athlete confirmation
- Public Visitor: only `ACTIVE` memberships the athlete's visibility allows; pending memberships are never visible

### Visibility settings (L1, planned)

- Athlete: read and write own
- Trainer / Public Visitor: deny (they see only the effect, not the settings)
- API Server: read to apply filtering

## Break-glass rule

If Support Admin access to L2-CONFIDENTIAL data is ever required:

1. purpose must be declared
2. access must be time-scoped
3. audit event is mandatory
4. the access path is a database-level operation approved by the project owner; it is never an application endpoint, role, or procedure, and never exists for trainers or clubs
