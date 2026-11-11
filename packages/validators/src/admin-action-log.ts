import { z } from 'zod';

import { cuidSchema, datetimeSchema, paginatedOutput, paginationInput } from './common.js';
import { adminActionEnum, adminActionTargetTypeEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Append-only record of every successful admin write (ADR-017), inserted in
// the same transaction as the write. Only the API's database connection
// writes it; client roles have no access. Never returned by any procedure.
// ──────────────────────────────────────────────

// Metadata holds ids, counts and changed field NAMES only. Never an email,
// never a field value, never L2. Unknown keys are rejected so a caller can't
// slip a value in.
export const adminActionMetadataSchema = z
  .object({
    clubId: cuidSchema.optional(),
    changedFields: z.array(z.enum(['name', 'countryCode', 'city'])).optional(),
    cancelledCertificationRequests: z.number().int().nonnegative().optional(),
    rejectedMembershipInvitations: z.number().int().nonnegative().optional(),
    revokedTrainerInvitations: z.number().int().nonnegative().optional(),
    closedExpiredInvitationId: cuidSchema.optional(),
  })
  .strict();
export type AdminActionMetadata = z.infer<typeof adminActionMetadataSchema>;

export const adminActionLogSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  actorUserAccountId: cuidSchema, /// L1-INTERNAL
  action: adminActionEnum, /// L1-INTERNAL
  targetType: adminActionTargetTypeEnum, /// L1-INTERNAL
  targetId: cuidSchema, /// L1-INTERNAL
  requestId: z.string().min(1), /// L1-INTERNAL
  metadata: adminActionMetadataSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type AdminActionLog = z.infer<typeof adminActionLogSchema>;

// ──────────────────────────────────────────────
// ADMIN INSIGHTS — overview and action log reads (add-web-admin-insights)
// ──────────────────────────────────────────────

// Admin: platform overview counts. All six come from one database snapshot;
// `generatedAt` is taken just before it. No athlete count or data.
export const adminOverviewOutput = z.object({
  activeClubs: z.number().int().nonnegative(), /// L1-INTERNAL
  deactivatedClubs: z.number().int().nonnegative(), /// L1-INTERNAL
  activeClubsWithoutTrainer: z.number().int().nonnegative(), /// L1-INTERNAL
  activeTrainers: z.number().int().nonnegative(), /// L1-INTERNAL
  pendingTrainerInvitations: z.number().int().nonnegative(), /// L1-INTERNAL
  expiringTrainerInvitations: z.number().int().nonnegative(), /// L1-INTERNAL
  generatedAt: datetimeSchema, /// L1-INTERNAL
});
export type AdminOverviewOutput = z.infer<typeof adminOverviewOutput>;

// Admin: the action log newest first, optionally by action and by club. The
// club filter matches club targets and trainer/invitation rows of that club.
export const listAdminActionsInput = paginationInput.extend({
  action: adminActionEnum.optional(),
  clubId: cuidSchema.optional(),
});
export type ListAdminActionsInput = z.infer<typeof listAdminActionsInput>;

// Non-sensitive metadata shown to admins: changed field NAMES and the
// deactivation counts. `clubId` and `closedExpiredInvitationId` are dropped.
export const adminActionDetailsOutput = adminActionMetadataSchema.pick({
  changedFields: true,
  cancelledCertificationRequests: true,
  rejectedMembershipInvitations: true,
  revokedTrainerInvitations: true,
});
export type AdminActionDetailsOutput = z.infer<typeof adminActionDetailsOutput>;

// Admin: one action log entry. Never carries the request id or any internal
// actor id; the actor is "you" or the acting admin's current auth email.
export const adminActionEntryOutput = z.object({
  id: cuidSchema, /// L1-INTERNAL
  action: adminActionEnum, /// L1-INTERNAL
  targetType: adminActionTargetTypeEnum, /// L1-INTERNAL
  targetId: cuidSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  club: z
    .object({
      id: cuidSchema, /// L0-PUBLIC
      name: z.string(), /// L0-PUBLIC
    })
    .nullable(),
  details: adminActionDetailsOutput, /// L1-INTERNAL
  actor: z.object({
    isYou: z.boolean(), /// L1-INTERNAL
    // Null for the caller's own rows, or when the lookup fails or the auth
    // account no longer exists. Returned to admins only, never logged.
    email: z.string().nullable(), /// L1-INTERNAL
  }),
});
export type AdminActionEntryOutput = z.infer<typeof adminActionEntryOutput>;

export const adminActionListOutput = paginatedOutput(adminActionEntryOutput);
export type AdminActionListOutput = z.infer<typeof adminActionListOutput>;
