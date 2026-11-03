import { z } from 'zod';

import { clubPublicOutput } from './club.js';
import { cuidSchema, datetimeSchema, paginatedOutput, paginationInput } from './common.js';
import { trainerInvitationStateEnum, trainerInvitationStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// An admin invites an email to be a trainer of one club (ADR-017). Only the
// API reads and writes these rows: no client policies exist, so no database
// path trusts the JWT email claim. "Expired" is derived (PENDING and
// expiresAt <= now), never stored. After redaction `email` holds
// `redacted:<id>` and `redactedAt` is set.
// ──────────────────────────────────────────────

// Lowercased so the database CHECK (email = lower(email)) and the
// (club_id, lower(email)) unique index see one form.
export const trainerInvitationEmailSchema = z.string().trim().toLowerCase().max(254).email();

// How long an invitation stays acceptable after it is created.
export const TRAINER_INVITATION_TTL_DAYS = 14;

export const clubTrainerInvitationSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  clubId: cuidSchema, /// L1-INTERNAL
  // Not z.email(): a redacted row holds `redacted:<id>`.
  email: z.string().min(1).max(254), /// L1-INTERNAL
  status: trainerInvitationStatusEnum, /// L1-INTERNAL
  invitedByUserAccountId: cuidSchema, /// L1-INTERNAL
  acceptedByUserAccountId: cuidSchema.nullable(), /// L1-INTERNAL
  expiresAt: datetimeSchema, /// L1-INTERNAL
  respondedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  redactedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
});
export type ClubTrainerInvitation = z.infer<typeof clubTrainerInvitationSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

// Admin: invite an email to one club.
export const inviteTrainerInput = z.object({
  clubId: cuidSchema,
  email: trainerInvitationEmailSchema,
});
export type InviteTrainerInput = z.infer<typeof inviteTrainerInput>;

// Admin revoke, or invitee accept / decline.
export const trainerInvitationIdInput = z.object({
  invitationId: cuidSchema,
});
export type TrainerInvitationIdInput = z.infer<typeof trainerInvitationIdInput>;

// Admin: revoke one trainer assignment.
export const clubTrainerIdInput = z.object({
  clubTrainerId: cuidSchema,
});
export type ClubTrainerIdInput = z.infer<typeof clubTrainerIdInput>;

export const listClubTrainersInput = paginationInput.extend({
  clubId: cuidSchema,
});
export type ListClubTrainersInput = z.infer<typeof listClubTrainersInput>;

export const listClubTrainerInvitationsInput = paginationInput.extend({
  clubId: cuidSchema,
});
export type ListClubTrainerInvitationsInput = z.infer<typeof listClubTrainerInvitationsInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — no L2 fields, no Supabase ids
// ──────────────────────────────────────────────

export const clubTrainerStatusEnum = z.enum(['ACTIVE', 'REVOKED']);
export type ClubTrainerStatus = z.infer<typeof clubTrainerStatusEnum>;

// Admin: one trainer of a club. `invitedEmail` is the address of the
// invitation that created or restored the row (labelled as the invited
// address, not the current sign-in email); null when the trainer predates
// invitations or the invitation was redacted.
export const adminClubTrainerOutput = z.object({
  id: cuidSchema, /// L1-INTERNAL
  status: clubTrainerStatusEnum, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  revokedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  invitedEmail: z.string().nullable(), /// L1-INTERNAL
});
export type AdminClubTrainerOutput = z.infer<typeof adminClubTrainerOutput>;

export const adminClubTrainerListOutput = paginatedOutput(adminClubTrainerOutput);
export type AdminClubTrainerListOutput = z.infer<typeof adminClubTrainerListOutput>;

// Admin: one invitation with its derived state. `email` is null once redacted.
export const adminTrainerInvitationOutput = clubTrainerInvitationSchema
  .pick({ id: true, expiresAt: true, respondedAt: true, createdAt: true })
  .extend({
    email: z.string().nullable(), /// L1-INTERNAL
    state: trainerInvitationStateEnum, /// L1-INTERNAL
  });
export type AdminTrainerInvitationOutput = z.infer<typeof adminTrainerInvitationOutput>;

export const adminTrainerInvitationListOutput = paginatedOutput(adminTrainerInvitationOutput);
export type AdminTrainerInvitationListOutput = z.infer<typeof adminTrainerInvitationListOutput>;

// Admin: result of inviteTrainer. `expiresAt` goes into the admin's
// instructions to the invitee.
export const inviteTrainerOutput = clubTrainerInvitationSchema
  .pick({ id: true, expiresAt: true })
  .extend({ state: trainerInvitationStateEnum });
export type InviteTrainerOutput = z.infer<typeof inviteTrainerOutput>;

// Invitee: a pending, unexpired invitation addressed to their confirmed email.
export const myTrainerInvitationOutput = clubTrainerInvitationSchema
  .pick({ id: true, expiresAt: true })
  .extend({ club: clubPublicOutput });
export type MyTrainerInvitationOutput = z.infer<typeof myTrainerInvitationOutput>;

export const myTrainerInvitationListOutput = z.object({
  items: z.array(myTrainerInvitationOutput),
});
export type MyTrainerInvitationListOutput = z.infer<typeof myTrainerInvitationListOutput>;

// Result of revokeTrainerInvitation / accept / decline.
export const trainerInvitationMutationOutput = z.object({
  id: cuidSchema, /// L1-INTERNAL
  state: trainerInvitationStateEnum, /// L1-INTERNAL
});
export type TrainerInvitationMutationOutput = z.infer<typeof trainerInvitationMutationOutput>;

// Result of accept: the club the caller is now a trainer of.
export const acceptTrainerInvitationOutput = trainerInvitationMutationOutput.extend({
  clubId: cuidSchema, /// L1-INTERNAL
});
export type AcceptTrainerInvitationOutput = z.infer<typeof acceptTrainerInvitationOutput>;

// Result of revokeTrainer.
export const revokeClubTrainerOutput = adminClubTrainerOutput.pick({
  id: true,
  status: true,
  revokedAt: true,
});
export type RevokeClubTrainerOutput = z.infer<typeof revokeClubTrainerOutput>;
