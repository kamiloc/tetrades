# ERM Fragments

`docs/erm.mmd` is the full composite. These files split it by capability. Each entity is canonical in exactly one file; other files show it as REFERENCE ONLY with just the fields touched by relationships.

| File | Status | Canonical entities | Referenced entities |
| --- | --- | --- | --- |
| `auth.mmd` | built | UserAccount | Athlete, AuditEvent, DataLifecycleRequest |
| `athlete-profile-core.mmd` | built | Athlete, Sport, AthletePublicProfile, AthletePrivateProfile, AthleteAchievement, ProfilePhotoAsset | UserAccount, AthleteConnection, PiiConsentLog, AuditEvent, DataLifecycleRequest |
| `connections.mmd` | built | AthleteConnection | Athlete |
| `compliance.mmd` | built | PiiConsentLog, AuditEvent, DataLifecycleRequest | Athlete, UserAccount |
| `clubs.mmd` | built | Club, ClubTrainer, ClubMembership | Athlete, UserAccount |
| `sport-metrics.mmd` | built | MetricDefinition, AthleteMetricEntry, AthleteMetricSummary | Athlete, Sport, ClubTrainer, ClubMembership |
| `visibility.mmd` | built | AthleteVisibilitySettings | Athlete |
| `notifications.mmd` | built | DeviceToken | UserAccount |

The clubs, metrics, and visibility fragments follow the capabilities of openspec change `add-clubs-metrics-visibility-model`; ADR-013's open items (trainer role model, membership states) were closed by that change.
