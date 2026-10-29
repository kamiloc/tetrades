# Web portal design audit

**Reviewed:** 2026-10-28  
**Design source:** [`web/index.html`](web/index.html) and the JSX files in [`web/`](web/)  
**Scope:** Admin portal and trainer portal visual prototype, checked against ADR-013–016, the PII access matrix, and the current API.

## Design assessment

The handoff presents two distinct jobs in a consistent desktop shell: platform operations manage clubs and trainer accounts; trainers work within a selected club to view athletes, report metrics, and decide certification requests. The shared navigation, tables, filters, and detail panels make the two roles easy to scan. The strong contrast between the dark role sidebar and the light work area fits the existing Athlete Passport visual language.

Treat every row, count, status, permission, and action in this prototype as illustrative. The JSX uses hard-coded records and interactive-looking controls; navigation items and many buttons are presentation-only, so the prototype is not an application or an authorization contract. The artboards are fixed at 1440 × 900. Production work still needs responsive layouts, keyboard and screen-reader behavior, focus states, and complete empty, loading, error, and confirmation states.

## Required product and access boundaries

- Trainer access is club-scoped. A trainer can read roster and metric data only for athletes with an `ACTIVE` membership to a club where that user has a `ClubTrainer` assignment. Pending, completed, and rejected memberships grant no access.
- An athlete must accept a club invitation before the membership becomes active. The current API supports trainer-to-athlete invitations and athlete acceptance or rejection. It does not support trainer invitations from a club trainer.
- Trainers may report metric entries only for an athlete with that active membership. Entries are trainer-attributed and append-only; summaries are derived. Do not imply that a trainer can edit or delete a submitted entry.
- Certification is a request from an athlete for one active club. Trainers assigned to that club see only its pending requests and may approve or reject them. Rejection requires a reason. Trainers cannot browse or certify an athlete's general achievement list through club affiliation; they cannot add achievements for athletes.
- Trainers never access `AthletePrivateProfile`, exact date of birth, contact details, or other L2 data. Keep athlete detail surfaces to fields explicitly returned by the trainer roster or pending-certification APIs. Do not show a calculated exact age or internal identifiers.
- Visibility settings govern what the athlete exposes to public audiences. Trainer access to metrics and certification requests comes from the scoped workflows above, not from bypassing visibility for unrelated profile data.
- Platform administration is not yet a defined application authorization model. Any future admin capability must be separately specified and enforced server-side. It must not grant cross-tenant L2 access. Global audit-log access is also not implied: `audit_log` is append-only and its current read policy is actor-scoped.

## Design-to-domain gaps

| Prototype surface | Audit finding | Handoff direction |
| --- | --- | --- |
| Admin overview, club applications, approve/decline, suspended clubs | The domain has no club application/review state or admin club-management API. Clubs and trainers are currently provisioned out of band. `Club` status values and application document review are not defined by ADR-013. | Keep this as a future platform-operations concept. Do not wire its controls to existing athlete/trainer procedures. Define the admin role, club lifecycle, allowed changes, and audit requirements before implementation. |
| Admin trainer table and invite modal | The API has no trainer provisioning, credential review, suspension, or admin invite procedure. `ClubTrainer` assignments do not include the prototype's `View` / `Log` / `Verify` permission set. | Treat role, credentials, permissions, invitation, and account status as unresolved product decisions. Do not use UI permission toggles as authorization; enforce any approved capabilities on the server. |
| Admin audit log / recent activity | The prototype suggests global operational and audit history. Existing `audit_log` is a security audit table with actor-scoped reads and no update/delete; it is not a general admin activity feed. | Do not expose `audit_log` globally or repurpose it as product activity. Specify a separate activity model or explicitly approved audit access before adding this surface. |
| Club application documents and trainer credential files | The prototype displays identity/credential documents and an owner identity checklist, but there is no document-ingestion, classification, retention, storage, or review workflow for these records. | Keep document upload/review out of implementation until data classification, storage access, retention/deletion, and reviewer access are specified. Never route such documents through public profile-photo storage. |
| Trainer home and achievements queue | The prototype's queue includes results, honors, tests, evidence files, and generic “Verify” actions. The API supports only pending `AchievementCertificationRequest` records created by athletes; there is no evidence field or general verification queue. | Present only pending requests addressed to the trainer's club. Show the achievement title, organization, date, and permitted athlete L0 identity. The decision flow is Approve or Reject with a required reason; remove “ask for info” unless a new lifecycle is designed. |
| Athlete detail: Add achievement, sessions, access, attendance | Trainers cannot add an athlete's achievement. Session, attendance, group, and access-management APIs/models are absent. The shown exact age and `AP-…` identifier are not part of the defined trainer contract. | Keep only implemented, explicitly authorized roster, metric, and pending-certification information. Remove unsupported tabs/actions and avoid age, contact data, or internal IDs. |
| Log metrics modal | Metric reporting exists, but the prototype adds conditions and evidence upload/verification semantics that are not in the metric entry contract. It also visually mixes metric logging with achievement verification. | Use the metric catalog and fields supported by the API. Confirm active membership at write time, identify the reporting trainer, and describe the saved entry as trainer-reported. Do not add evidence or an independent verification status without a domain change. |
| Trainer invitations | Athlete invitations match the current club workflow, but the prototype also invites trainers/staff, accepts email lists, and creates shareable links. Those capabilities are not present. | Limit the current workflow to a trainer inviting an athlete to that trainer's club. Keep the membership pending until athlete confirmation. Defer trainer/staff invites and share links. |
| Search, exports, messages, sessions | Global search, CSV exports, messaging, and session logging are shown without matching procedures or data contracts. | Mark as prototype-only or remove from the implementation scope until APIs, privacy rules, pagination, and export requirements are defined. |
| Sample data and locale | Examples use US clubs, credentials, locations, emails, date formats, and fictional volume counts. They are mock data, not seed data or a statement of supported geographies. | Label all records as illustrative. For future production examples, use plausible Colombian clubs and formats consistent with the selected product locale; never copy prototype records into Prisma seeds. |

## Prototype inventory

### Admin portal

- A1: platform overview, approval queue, and recent activity
- A2: club list and application detail/review
- A3: trainer directory and invitation modal

### Trainer portal

- T1: club dashboard
- T2: athlete roster
- T3: athlete detail and metric logging modal
- T4: achievement review queue
- T5: club invitations

These names describe the design canvas only. They do not imply that routes, APIs, user roles, or workflows exist in production.

## Implementation readiness

The trainer portal has a partial backend foundation: `club.listRoster`, `metric.reportEntry`, `metric.listEntries`, `metric.getSummaries`, `achievement.listPendingCertifications`, and `achievement.decideCertification`. Implementing the portal still requires a route and interface design that fits those contracts, along with explicit handling of authorization and query states.

The admin portal has no matching authorization contract or management API. It requires product and security decisions before it can be treated as an implementation-ready handoff. Do not infer a broad SYSTEM role from the existing rate-limit role hint; that resolver is explicitly not an authorization decision.

Before production implementation, reconcile the prototype with this audit and define responsive web behavior, supported locale, role provisioning, and any new data lifecycle. Any schema change must follow the repository's Zod-first and migration-review rules; any RLS change must follow the policy confirmation and test rules in `AGENTS.md`.
