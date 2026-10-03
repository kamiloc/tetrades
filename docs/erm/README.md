# ERM Fragments

`docs/erm.mmd` is the full composite. These files split it by capability. Each entity is canonical in exactly one file; other files show it as REFERENCE ONLY with just the fields touched by relationships.

| File | Status | Canonical entities | Referenced entities |
| --- | --- | --- | --- |
| `auth.mmd` | built | UserAccount | Athlete, AuditEvent, DataLifecycleRequest |
| `athlete-profile-core.mmd` | built | Athlete, Sport, AthletePublicProfile, AthletePrivateProfile, AthleteAchievement, ProfilePhotoAsset | UserAccount, AthleteConnection, PiiConsentLog, AuditEvent, DataLifecycleRequest |
| `connections.mmd` | built | AthleteConnection | Athlete |
| `compliance.mmd` | built | PiiConsentLog, AuditEvent, DataLifecycleRequest | Athlete, UserAccount |
| `planned-clubs-metrics-visibility.mmd` | planned | Club, ClubTrainer, ClubMembership, MetricDefinition, AthleteMetricEntry, AthleteMetricSummary, AthleteVisibilitySettings | Athlete, UserAccount (edge endpoints only) |

The planned file is intentionally a single undivided annex: ADR-013's open items (trainer role model, membership terminal state, membership removal) leave its capability boundaries undecided.
