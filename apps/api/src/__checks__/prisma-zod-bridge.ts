// apps/api/src/__checks__/prisma-zod-bridge.ts
//
// Compile-time assertions: Prisma model types MUST be assignable to the
// Zod-inferred types from @packages/validators. If Prisma drifts in a way
// that breaks assignability to the validators contract, `tsc --noEmit`
// fails and the CI typecheck blocks the merge.
//
// Zod is the source of truth (AGENTS.md / ADR-002). We assert the direction
// Prisma → Zod: the database row shape must satisfy the validator contract.
// Extra fields on the Prisma side are tolerated (structural typing); missing
// fields or incompatible types fail.
//
// Lives in @app/api because @packages/validators is contractually restricted
// to `zod` imports only (AGENTS.md Package Contracts).
//
// IsAssignable wraps both operands in a tuple to suppress TypeScript's
// distributive conditional behavior — without the tuple, a `From` type that
// resolves to a union (which Prisma's `$Result.DefaultSelection<...>` can do)
// distributes the `extends` check across union members and produces false
// negatives even when assignability holds at the whole-object level.

import type { ClubMembershipStatusValue } from '@packages/shared-logic';
import type {
  Athlete,
  AthleteAchievement,
  AthleteMetricEntry,
  AthleteMetricSummary,
  AthleteVisibilitySettings,
  AuditEvent,
  Club,
  ClubMembership,
  ClubMembershipStatus,
  ClubTrainer,
  DeviceToken,
  MetricDefinition,
  PiiConsentLog,
  Sport,
  UserAccount,
} from '@packages/validators';
import type {
  Athlete as PrismaAthlete,
  AthleteAchievement as PrismaAthleteAchievement,
  AthleteMetricEntry as PrismaAthleteMetricEntry,
  AthleteMetricSummary as PrismaAthleteMetricSummary,
  AthleteVisibilitySettings as PrismaAthleteVisibilitySettings,
  AuditEvent as PrismaAuditEvent,
  Club as PrismaClub,
  ClubMembership as PrismaClubMembership,
  ClubTrainer as PrismaClubTrainer,
  DeviceToken as PrismaDeviceToken,
  MetricDefinition as PrismaMetricDefinition,
  PiiConsentLog as PrismaPiiConsentLog,
  Sport as PrismaSport,
  UserAccount as PrismaUserAccount,
} from '@prisma/client';


type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<T extends true> = T;

// If any of these lines produces a TS error, the bridge check fails and the
// error message points to the Prisma model that no longer matches its Zod
// contract. Fix by updating the corresponding schema in
// packages/validators/src/* (Zod first, per ADR-002).
type _userAccount_ok = Assert<IsAssignable<PrismaUserAccount, UserAccount>>;
type _sport_ok = Assert<IsAssignable<PrismaSport, Sport>>;
type _athlete_ok = Assert<IsAssignable<PrismaAthlete, Athlete>>;
type _achievement_ok = Assert<IsAssignable<PrismaAthleteAchievement, AthleteAchievement>>;
// Prisma `Json?` columns (AuditEvent.metadata) generate
// as `Prisma.JsonValue | null`, a recursive union
// (`string | number | boolean | JsonObject | JsonArray | null`). The Zod
// schemas narrow these to `Record<string, unknown> | null`, which is the
// intended app-level contract enforced at runtime by Zod. The narrowing
// cannot be enforced structurally against Prisma's broader Json type at
// compile time — Json columns are unconstrained at the database layer, so
// this is a schema-level fact, not Zod↔Prisma drift. We exclude only those
// individual Json fields from the structural check; every other field on
// these models is still bridged.
//
// `Pick` is driven by the Zod-side key set (a plain object union) because
// `Omit<PrismaT, ...>` over Prisma's complex `$Result.DefaultSelection<...>`
// type leaks phantom keys that defeat the structural check.
type _piiConsent_ok = Assert<IsAssignable<PrismaPiiConsentLog, PiiConsentLog>>;
type AuditEventBridgeKeys = Exclude<keyof AuditEvent, 'metadata'>;
type _auditEvent_ok = Assert<
  IsAssignable<Pick<PrismaAuditEvent, AuditEventBridgeKeys>, Pick<AuditEvent, AuditEventBridgeKeys>>
>;


// Clubs, metrics & visibility (ADR-013).
type _club_ok = Assert<IsAssignable<PrismaClub, Club>>;
type _clubTrainer_ok = Assert<IsAssignable<PrismaClubTrainer, ClubTrainer>>;
type _clubMembership_ok = Assert<IsAssignable<PrismaClubMembership, ClubMembership>>;
type _metricDefinition_ok = Assert<IsAssignable<PrismaMetricDefinition, MetricDefinition>>;
type _visibility_ok = Assert<IsAssignable<PrismaAthleteVisibilitySettings, AthleteVisibilitySettings>>;
// Decimal(12,4) columns generate as `Prisma.Decimal`; the Zod contract is
// `number` and services convert at the boundary. Like the Json exclusion
// above, only those fields are left out of the structural check.
type EntryBridgeKeys = Exclude<keyof AthleteMetricEntry, 'value'>;
type _metricEntry_ok = Assert<
  IsAssignable<Pick<PrismaAthleteMetricEntry, EntryBridgeKeys>, Pick<AthleteMetricEntry, EntryBridgeKeys>>
>;
type SummaryBridgeKeys = Exclude<keyof AthleteMetricSummary, 'latestValue'>;
type _metricSummary_ok = Assert<
  IsAssignable<
    Pick<PrismaAthleteMetricSummary, SummaryBridgeKeys>,
    Pick<AthleteMetricSummary, SummaryBridgeKeys>
  >
>;
type _deviceToken_ok = Assert<IsAssignable<PrismaDeviceToken, DeviceToken>>;
// @packages/shared-logic cannot import Zod, so its transition-table literals
// are checked against the Zod enum in both directions here.
type _membershipStatus_ok = Assert<IsAssignable<ClubMembershipStatusValue, ClubMembershipStatus>>;
type _membershipStatus_rev_ok = Assert<IsAssignable<ClubMembershipStatus, ClubMembershipStatusValue>>;

// Keep TS from tree-shaking the file out of the project graph.
export const __prismaZodBridge = true;
