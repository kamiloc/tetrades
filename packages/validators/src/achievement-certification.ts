import { z } from 'zod';

import {
  cuidSchema,
  datetimeSchema,
  paginatedOutput,
  paginationInput,
  slugSchema,
} from './common.js';
import { certificationRequestStatusEnum } from './enums.js';

// ──────────────────────────────────────────────
// BASE SCHEMA — mirrors Prisma model 1:1
// An athlete asks one club (with an ACTIVE membership) to certify one
// achievement; a trainer of that club approves or rejects it. Written only by
// the API (no client write policies). At most one PENDING row per achievement.
// ──────────────────────────────────────────────

export const rejectionReasonSchema = z.string().trim().min(1).max(300);

export const achievementCertificationRequestSchema = z.object({
  id: cuidSchema, /// L1-INTERNAL
  achievementId: cuidSchema, /// L1-INTERNAL
  clubId: cuidSchema, /// L0-PUBLIC
  clubMembershipId: cuidSchema, /// L1-INTERNAL
  status: certificationRequestStatusEnum, /// L1-INTERNAL
  requestedAt: datetimeSchema, /// L1-INTERNAL
  decidedByClubTrainerId: cuidSchema.nullable(), /// L1-INTERNAL
  decidedAt: datetimeSchema.nullable(), /// L1-INTERNAL
  rejectionReason: rejectionReasonSchema.nullable(), /// L1-INTERNAL
});
export type AchievementCertificationRequest = z.infer<typeof achievementCertificationRequestSchema>;

// ──────────────────────────────────────────────
// INPUT SCHEMAS
// ──────────────────────────────────────────────

// Athlete: ask a club where they are ACTIVE to certify their own achievement.
export const requestCertificationInput = z.object({
  achievementId: cuidSchema,
  clubId: cuidSchema,
});
export type RequestCertificationInput = z.infer<typeof requestCertificationInput>;

// Athlete: withdraw their own PENDING request.
export const withdrawCertificationInput = z.object({
  requestId: cuidSchema,
});
export type WithdrawCertificationInput = z.infer<typeof withdrawCertificationInput>;

// Athlete: their own requests, every status.
export const listMyCertificationRequestsInput = paginationInput;
export type ListMyCertificationRequestsInput = z.infer<typeof listMyCertificationRequestsInput>;

// Trainer: the club's PENDING queue (clubId proves the trainer row).
export const listPendingCertificationsInput = paginationInput.extend({
  clubId: cuidSchema,
});
export type ListPendingCertificationsInput = z.infer<typeof listPendingCertificationsInput>;

// Trainer: decide a request made to their club. Rejecting requires a reason.
export const decideCertificationInput = z.discriminatedUnion('decision', [
  z.object({ clubId: cuidSchema, requestId: cuidSchema, decision: z.literal('APPROVE') }),
  z.object({
    clubId: cuidSchema,
    requestId: cuidSchema,
    decision: z.literal('REJECT'),
    rejectionReason: rejectionReasonSchema,
  }),
]);
export type DecideCertificationInput = z.infer<typeof decideCertificationInput>;

// ──────────────────────────────────────────────
// OUTPUT SCHEMAS — no L2 fields, no trainer ids
// ──────────────────────────────────────────────

// The athlete's own view: which club, where it stands, and why it was rejected.
export const myCertificationRequestOutput = achievementCertificationRequestSchema
  .pick({
    id: true,
    achievementId: true,
    status: true,
    requestedAt: true,
    decidedAt: true,
    rejectionReason: true,
  })
  .extend({
    club: z.object({ id: cuidSchema, name: z.string() }), /// L0-PUBLIC
  });
export type MyCertificationRequestOutput = z.infer<typeof myCertificationRequestOutput>;

export const myCertificationRequestListOutput = paginatedOutput(myCertificationRequestOutput);
export type MyCertificationRequestListOutput = z.infer<typeof myCertificationRequestListOutput>;

// A trainer's queue item: the one achievement under review and the athlete's
// public identity. Never the athlete's other achievements or private data.
export const pendingCertificationOutput = achievementCertificationRequestSchema
  .pick({ id: true, requestedAt: true })
  .extend({
    achievement: z.object({
      title: z.string(), /// L0-PUBLIC
      organization: z.string(), /// L0-PUBLIC
      achievedOn: datetimeSchema, /// L0-PUBLIC
    }),
    athlete: z.object({
      id: cuidSchema, /// L0-PUBLIC
      slug: slugSchema, /// L0-PUBLIC
      displayName: z.string(), /// L0-PUBLIC
    }),
  });
export type PendingCertificationOutput = z.infer<typeof pendingCertificationOutput>;

export const pendingCertificationListOutput = paginatedOutput(pendingCertificationOutput);
export type PendingCertificationListOutput = z.infer<typeof pendingCertificationListOutput>;

// Result of request / withdraw / decide.
export const certificationMutationOutput = achievementCertificationRequestSchema.pick({
  id: true,
  status: true,
});
export type CertificationMutationOutput = z.infer<typeof certificationMutationOutput>;
