import { z } from 'zod';

import { clubPublicOutput } from './club.js';
import { cuidSchema, datetimeSchema, paginatedOutput, paginationInput, slugSchema } from './common.js';
import { clubMembershipStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// Never used directly in tRPC outputs.
// ──────────────────────────────────────────────

export const clubMembershipSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  clubId: cuidSchema, /// L0-PUBLIC
  athleteId: cuidSchema, /// L1-INTERNAL
  status: clubMembershipStatusEnum, /// L1-INTERNAL
  invitedByClubTrainerId: cuidSchema, /// L1-INTERNAL
  createdAt: datetimeSchema, /// L1-INTERNAL
  respondedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  endedAt: datetimeSchema.nullable(), /// L1-INTERNAL
});
export type ClubMembership = z.infer<typeof clubMembershipSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// The acting trainer / athlete is always derived from ctx.userId.
// ──────────────────────────────────────────────

export const inviteAthleteToClubInput = z.object({
  clubId: cuidSchema,
  athleteId: cuidSchema,
});
export type InviteAthleteToClubInput = z.infer<typeof inviteAthleteToClubInput>;

export const respondToClubInvitationInput = z.object({
  membershipId: cuidSchema,
  status: clubMembershipStatusEnum.extract(['ACTIVE', 'REJECTED']),
});
export type RespondToClubInvitationInput = z.infer<typeof respondToClubInvitationInput>;

export const leaveClubInput = z.object({
  membershipId: cuidSchema,
});
export type LeaveClubInput = z.infer<typeof leaveClubInput>;

export const listMyClubMembershipsInput = paginationInput;
export type ListMyClubMembershipsInput = z.infer<typeof listMyClubMembershipsInput>;

export const listClubRosterInput = paginationInput.extend({
  clubId: cuidSchema,
});
export type ListClubRosterInput = z.infer<typeof listClubRosterInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — no L2 fields, no trainer ids
// ──────────────────────────────────────────────

// The athlete's own view of a membership.
export const clubMembershipOwnerOutput = clubMembershipSchema
  .pick({ id: true, status: true, createdAt: true, respondedAt: true, endedAt: true })
  .extend({ club: clubPublicOutput });
export type ClubMembershipOwnerOutput = z.infer<typeof clubMembershipOwnerOutput>;

export const clubMembershipOwnerListOutput = paginatedOutput(clubMembershipOwnerOutput);
export type ClubMembershipOwnerListOutput = z.infer<typeof clubMembershipOwnerListOutput>;

// A trainer's roster row. Athlete identity is limited to L0 fields.
export const clubRosterEntryOutput = clubMembershipSchema
  .pick({ id: true, status: true, createdAt: true, respondedAt: true })
  .extend({
    athlete: z.object({
      id: cuidSchema, /// L0-PUBLIC
      slug: slugSchema, /// L0-PUBLIC
      displayName: z.string(), /// L0-PUBLIC
    }),
  });
export type ClubRosterEntryOutput = z.infer<typeof clubRosterEntryOutput>;

export const clubRosterListOutput = paginatedOutput(clubRosterEntryOutput);
export type ClubRosterListOutput = z.infer<typeof clubRosterListOutput>;

// Result of invite / respond / leave.
export const clubMembershipMutationOutput = clubMembershipSchema.pick({
  id: true,
  status: true,
});
export type ClubMembershipMutationOutput = z.infer<typeof clubMembershipMutationOutput>;
