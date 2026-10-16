import {
  athleteAchievementPublicListOutput,
  athleteAchievementSchema,
  certificationMutationOutput,
  createAchievementInput,
  decideCertificationInput,
  listAchievementsInput,
  listMyCertificationRequestsInput,
  listPendingCertificationsInput,
  myCertificationRequestListOutput,
  pendingCertificationListOutput,
  requestCertificationInput,
  withdrawCertificationInput,
} from '@packages/validators';
import { TRPCError } from '@trpc/server';

import { listAchievements } from '../services/achievements.js';
import {
  decideCertification,
  listMyRequests,
  listPendingForClub,
  requestCertification,
  withdrawCertification,
} from '../services/certification.js';
import { requireViewerAthlete, resolveViewer } from '../services/viewer.js';
import { protectedProcedure, publicProcedure, router, trainerProcedure } from '../trpc.js';

const achievementSelect = {
  id: true,
  athleteId: true,
  title: true,
  organization: true,
  achievedOn: true,
  verificationStatus: true,
  verificationSource: true,
  createdAt: true,
} as const;

export const achievementRouter = router({
  addAchievement: protectedProcedure
    .input(createAchievementInput)
    .output(athleteAchievementSchema)
    .mutation(async ({ ctx, input }) => {
      const userAccount = await ctx.prisma.userAccount.findUnique({
        where: { supabaseUserId: ctx.userId },
        select: { athlete: { select: { id: true } } },
      });

      const athleteId = userAccount?.athlete?.id;
      if (!athleteId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
      }

      const achievement = await ctx.prisma.athleteAchievement.create({
        data: {
          athleteId,
          title: input.title,
          organization: input.organization,
          achievedOn: new Date(input.achievedOn),
          // Only the certification flow changes this (add-achievement-certification).
          verificationStatus: 'UNVERIFIED',
        },
        select: achievementSelect,
      });

      return achievement;
    }),

  // Public: anonymous callers see achievements whose audience is PUBLIC.
  // Visibility and the verified-only rule live in services/achievements.ts.
  listAchievements: publicProcedure
    .input(listAchievementsInput)
    .output(athleteAchievementPublicListOutput)
    .query(async ({ ctx, input }) =>
      listAchievements(ctx.prisma, await resolveViewer(ctx.prisma, ctx.userId), input),
    ),

  // ── Certification by club trainers (achievement-certification spec) ────────
  // Verification status changes only here; the athlete asks a club where they
  // are ACTIVE, and a trainer of that club decides.

  requestCertification: protectedProcedure
    .input(requestCertificationInput)
    .output(certificationMutationOutput)
    .mutation(async ({ ctx, input }) =>
      requestCertification(ctx.prisma, await requireViewerAthlete(ctx.prisma, ctx.userId), input, {
        jobs: ctx.jobs,
        requestId: ctx.requestId,
        log: ctx.log,
      }),
    ),

  withdrawCertification: protectedProcedure
    .input(withdrawCertificationInput)
    .output(certificationMutationOutput)
    .mutation(async ({ ctx, input }) =>
      withdrawCertification(ctx.prisma, await requireViewerAthlete(ctx.prisma, ctx.userId), input),
    ),

  listMyCertificationRequests: protectedProcedure
    .input(listMyCertificationRequestsInput)
    .output(myCertificationRequestListOutput)
    .query(async ({ ctx, input }) =>
      listMyRequests(ctx.prisma, await requireViewerAthlete(ctx.prisma, ctx.userId), input),
    ),

  listPendingCertifications: trainerProcedure
    .input(listPendingCertificationsInput)
    .output(pendingCertificationListOutput)
    .query(({ ctx, input }) => listPendingForClub(ctx.prisma, ctx.clubTrainer, input)),

  decideCertification: trainerProcedure
    .input(decideCertificationInput)
    .output(certificationMutationOutput)
    .mutation(({ ctx, input }) =>
      decideCertification(ctx.prisma, ctx.clubTrainer, input, {
        jobs: ctx.jobs,
        requestId: ctx.requestId,
        log: ctx.log,
      }),
    ),
});
