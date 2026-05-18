// apps/api/src/__checks__/prisma-zod-bridge.ts
//
// Compile-time assertions: Prisma model types MUST be assignable to the
// Zod-inferred types from @packages/validators. If Prisma drifts in a way
// that breaks assignability to the validators contract, `tsc --noEmit`
// fails and the CI typecheck blocks the merge.
//
// Zod is the source of truth (CLAUDE.md / ADR-002). We assert the direction
// Prisma → Zod: the database row shape must satisfy the validator contract.
// Extra fields on the Prisma side are tolerated (structural typing); missing
// fields or incompatible types fail.
//
// Lives in @app/api because @packages/validators is contractually restricted
// to `zod` imports only (CLAUDE.md Package Contracts).
//
// IsAssignable wraps both operands in a tuple to suppress TypeScript's
// distributive conditional behavior — without the tuple, a `From` type that
// resolves to a union (which Prisma's `$Result.DefaultSelection<...>` can do)
// distributes the `extends` check across union members and produces false
// negatives even when assignability holds at the whole-object level.

import type {
  Athlete,
  AthleteAchievement,
  AuditEvent,
  MedicalDocument,
  OcrJob,
  PiiConsentLog,
  Sport,
  UserAccount,
} from '@packages/validators';
import type {
  Athlete as PrismaAthlete,
  AthleteAchievement as PrismaAthleteAchievement,
  AuditEvent as PrismaAuditEvent,
  MedicalDocument as PrismaMedicalDocument,
  OcrJob as PrismaOcrJob,
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
type _medicalDoc_ok = Assert<IsAssignable<PrismaMedicalDocument, MedicalDocument>>;
// Prisma `Json?` columns (OcrJob.confidenceMap, AuditEvent.metadata) generate
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
type OcrJobBridgeKeys = Exclude<keyof OcrJob, 'confidenceMap'>;
type _ocrJob_ok = Assert<
  IsAssignable<Pick<PrismaOcrJob, OcrJobBridgeKeys>, Pick<OcrJob, OcrJobBridgeKeys>>
>;
type _piiConsent_ok = Assert<IsAssignable<PrismaPiiConsentLog, PiiConsentLog>>;
type AuditEventBridgeKeys = Exclude<keyof AuditEvent, 'metadata'>;
type _auditEvent_ok = Assert<
  IsAssignable<Pick<PrismaAuditEvent, AuditEventBridgeKeys>, Pick<AuditEvent, AuditEventBridgeKeys>>
>;

// Keep TS from tree-shaking the file out of the project graph.
export const __prismaZodBridge = true;
