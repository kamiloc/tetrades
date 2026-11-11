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

// The caller's own trainer clubs. The cursor is a club id.
export const listMyTrainerClubsInput = paginationInput;
export type ListMyTrainerClubsInput = z.infer<typeof listMyTrainerClubsInput>;

export const getRosterAthleteInput = z.object({
  clubId: cuidSchema,
  athleteId: cuidSchema,
});
export type GetRosterAthleteInput = z.infer<typeof getRosterAthleteInput>;

// Invite lookup (trainer-access-boundary exception): by name among
// searchable athletes, or by exact slug among all ACTIVE profiles.
export const findAthleteToInviteInput = z.discriminatedUnion('by', [
  paginationInput.extend({
    clubId: cuidSchema,
    by: z.literal('name'),
    query: z.string().trim().min(2).max(100),
  }),
  z.object({
    clubId: cuidSchema,
    by: z.literal('slug'),
    slug: slugSchema,
  }),
]);
export type FindAthleteToInviteInput = z.infer<typeof findAthleteToInviteInput>;

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

// L0 identity of an athlete as a trainer sees it: no profile details.
export const trainerAthleteIdentityOutput = z.object({
  id: cuidSchema, /// L0-PUBLIC
  slug: slugSchema, /// L0-PUBLIC
  displayName: z.string(), /// L0-PUBLIC
  sport: z.object({
    id: cuidSchema, /// L0-PUBLIC
    name: z.string(), /// L0-PUBLIC
  }),
});
export type TrainerAthleteIdentityOutput = z.infer<typeof trainerAthleteIdentityOutput>;

// A trainer's roster row. Athlete identity is limited to L0 fields.
export const clubRosterEntryOutput = clubMembershipSchema
  .pick({ id: true, status: true, createdAt: true, respondedAt: true })
  .extend({
    athlete: trainerAthleteIdentityOutput,
  });
export type ClubRosterEntryOutput = z.infer<typeof clubRosterEntryOutput>;

export const clubRosterListOutput = paginatedOutput(clubRosterEntryOutput);
export type ClubRosterListOutput = z.infer<typeof clubRosterListOutput>;

// One of the caller's trainer clubs. Never carries the ClubTrainer id.
export const myTrainerClubOutput = z.object({
  club: clubPublicOutput, /// L0-PUBLIC
});
export type MyTrainerClubOutput = z.infer<typeof myTrainerClubOutput>;

export const myTrainerClubListOutput = paginatedOutput(myTrainerClubOutput);
export type MyTrainerClubListOutput = z.infer<typeof myTrainerClubListOutput>;

// How an invite-lookup result relates to this club, as this trainer may
// see it. Another trainer's pending invitation maps to null.
export const athleteToInviteRelationEnum = z.enum(['MEMBER', 'INVITED_BY_YOU']);
export type AthleteToInviteRelation = z.infer<typeof athleteToInviteRelationEnum>;

export const athleteToInviteOutput = z.object({
  athlete: trainerAthleteIdentityOutput, /// L0-PUBLIC
  relation: athleteToInviteRelationEnum.nullable(), /// L1-INTERNAL
});
export type AthleteToInviteOutput = z.infer<typeof athleteToInviteOutput>;

export const athleteToInviteListOutput = paginatedOutput(athleteToInviteOutput);
export type AthleteToInviteListOutput = z.infer<typeof athleteToInviteListOutput>;

// Result of invite / respond / leave.
export const clubMembershipMutationOutput = clubMembershipSchema.pick({
  id: true,
  status: true,
});
export type ClubMembershipMutationOutput = z.infer<typeof clubMembershipMutationOutput>;
