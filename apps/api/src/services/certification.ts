/**
 * Achievement certification (achievement-certification spec, design D3).
 *
 * An athlete asks one club where they are ACTIVE to certify one of their
 * achievements; a trainer of that club approves or rejects it. Every status
 * change and the achievement's verificationStatus summary are written in one
 * transaction, and decisions use a conditional updateMany on PENDING so two
 * concurrent decisions can never both succeed. The DB enforces the lifecycle
 * for every writer (supabase/constraints/achievement_certification_transitions.sql)
 * and one open request per achievement (partial unique index).
 *
 * Error order follows metrics.reportEntry: NOT_FOUND, then FORBIDDEN, then
 * state checks. Notifications are enqueued after commit and never fail the
 * operation (membership-notifications spec).
 */
import { QUEUE_NAMES } from '@packages/queue';
import type {
  CertificationMutationOutput,
  DecideCertificationInput,
  ListMyCertificationRequestsInput,
  ListPendingCertificationsInput,
  MyCertificationRequestOutput,
  PendingCertificationOutput,
  RequestCertificationInput,
  WithdrawCertificationInput,
} from '@packages/validators';
import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { JobEnqueuer } from '../lib/jobs.js';
import { cursorArgs, toPage, type Page } from '../lib/pagination.js';

import type { ClubTrainerRef } from './membership.js';

const UNIQUE_VIOLATION = 'P2002';

/** The caller as an athlete, already resolved from ctx.userId. */
export interface CertificationAthlete {
  athleteId: string;
}

/** Where to announce requests and decisions; omitted in service-level tests. */
export interface CertificationNotifier {
  jobs: JobEnqueuer;
  requestId: string;
  log: { warn: (obj: Record<string, unknown>, msg?: string) => void };
}

const NOT_PENDING = 'This certification request is no longer pending';

async function notify(
  notifier: CertificationNotifier | undefined,
  notificationType: 'CERTIFICATION_REQUESTED' | 'CERTIFICATION_DECIDED',
  userAccountIds: string[],
  subjectId: string,
): Promise<void> {
  if (notifier === undefined) return;
  for (const userAccountId of userAccountIds) {
    try {
      await notifier.jobs.enqueue(QUEUE_NAMES.NOTIFICATIONS, {
        userAccountId,
        notificationType,
        subjectId,
        requestId: notifier.requestId,
      });
    } catch (error) {
      notifier.log.warn(
        {
          event: 'certification_notification_not_enqueued',
          requestId: notifier.requestId,
          notificationType,
          certificationRequestId: subjectId,
          error:
            error instanceof Error ? { name: error.name, message: error.message } : String(error),
        },
        'certification stored; push notification could not be scheduled',
      );
    }
  }
}

export async function requestCertification(
  prisma: PrismaClient,
  caller: CertificationAthlete,
  input: RequestCertificationInput,
  notifier?: CertificationNotifier,
): Promise<CertificationMutationOutput> {
  const [achievement, club] = await Promise.all([
    prisma.athleteAchievement.findUnique({
      where: { id: input.achievementId },
      select: { athleteId: true, verificationStatus: true },
    }),
    prisma.club.findUnique({ where: { id: input.clubId }, select: { id: true } }),
  ]);
  if (achievement === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Achievement not found' });
  }
  if (club === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Club not found' });
  }
  if (achievement.athleteId !== caller.athleteId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only request certification of your own achievements',
    });
  }

  let request: CertificationMutationOutput;
  try {
    request = await prisma.$transaction(async (tx) => {
      const membership = await tx.clubMembership.findFirst({
        where: { clubId: input.clubId, athleteId: caller.athleteId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (membership === null) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only request certification from a club you are an active member of',
        });
      }
      // Re-read under the transaction so a concurrent approval is seen.
      const current = await tx.athleteAchievement.findUniqueOrThrow({
        where: { id: input.achievementId },
        select: { verificationStatus: true },
      });
      if (current.verificationStatus === 'VERIFIED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This achievement is already verified',
        });
      }
      const created = await tx.achievementCertificationRequest.create({
        data: {
          achievementId: input.achievementId,
          clubId: input.clubId,
          clubMembershipId: membership.id,
          status: 'PENDING',
        },
        select: { id: true, status: true },
      });
      await tx.athleteAchievement.update({
        where: { id: input.achievementId },
        data: { verificationStatus: 'PENDING' },
        select: { id: true },
      });
      return created;
    });
  } catch (error) {
    // The partial unique index allows one PENDING request per achievement.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This achievement already has a pending certification request',
      });
    }
    throw error;
  }

  const trainers = await prisma.clubTrainer.findMany({
    where: { clubId: input.clubId },
    select: { userAccountId: true },
  });
  await notify(
    notifier,
    'CERTIFICATION_REQUESTED',
    trainers.map((t) => t.userAccountId),
    request.id,
  );
  return request;
}

export async function withdrawCertification(
  prisma: PrismaClient,
  caller: CertificationAthlete,
  input: WithdrawCertificationInput,
): Promise<CertificationMutationOutput> {
  const request = await prisma.achievementCertificationRequest.findUnique({
    where: { id: input.requestId },
    select: { status: true, achievementId: true, achievement: { select: { athleteId: true } } },
  });
  if (request === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Certification request not found' });
  }
  if (request.achievement.athleteId !== caller.athleteId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the athlete can withdraw this certification request',
    });
  }
  if (request.status !== 'PENDING') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: NOT_PENDING });
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.achievementCertificationRequest.updateMany({
      where: { id: input.requestId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (count === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: NOT_PENDING });
    }
    await tx.athleteAchievement.update({
      where: { id: request.achievementId },
      data: { verificationStatus: 'UNVERIFIED' },
      select: { id: true },
    });
    return { id: input.requestId, status: 'CANCELLED' as const };
  });
}

/** The athlete's own requests in every status, newest first, with reasons. */
export async function listMyRequests(
  prisma: PrismaClient,
  caller: CertificationAthlete,
  input: ListMyCertificationRequestsInput,
): Promise<Page<MyCertificationRequestOutput>> {
  const rows = await prisma.achievementCertificationRequest.findMany({
    where: { achievement: { athleteId: caller.athleteId } },
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      achievementId: true,
      status: true,
      requestedAt: true,
      decidedAt: true,
      rejectionReason: true,
      club: { select: { id: true, name: true } },
    },
  });
  return toPage(rows, input.take, (r) => r.id);
}

/**
 * The club's PENDING queue for `trainer` (already proven by trainerProcedure):
 * the achievement under review and the athlete's L0 identity, nothing else.
 */
export async function listPendingForClub(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: ListPendingCertificationsInput,
): Promise<Page<PendingCertificationOutput>> {
  const rows = await prisma.achievementCertificationRequest.findMany({
    where: { clubId: trainer.clubId, status: 'PENDING' },
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      requestedAt: true,
      achievement: {
        select: {
          title: true,
          organization: true,
          achievedOn: true,
          athlete: { select: { id: true, slug: true, displayName: true } },
        },
      },
    },
  });
  return toPage(
    rows.map(({ id, requestedAt, achievement: { athlete, ...achievement } }) => ({
      id,
      requestedAt,
      achievement,
      athlete,
    })),
    input.take,
    (r) => r.id,
  );
}

export async function decideCertification(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: DecideCertificationInput,
  notifier?: CertificationNotifier,
): Promise<CertificationMutationOutput> {
  const request = await prisma.achievementCertificationRequest.findUnique({
    where: { id: input.requestId },
    select: {
      clubId: true,
      achievementId: true,
      achievement: { select: { athleteId: true, athlete: { select: { userAccountId: true } } } },
    },
  });
  if (request === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Certification request not found' });
  }
  if (request.clubId !== trainer.clubId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This certification request was made to another club',
    });
  }

  const status = input.decision === 'APPROVE' ? ('APPROVED' as const) : ('REJECTED' as const);
  const result = await prisma.$transaction(async (tx) => {
    // ADR-013: club authority over the athlete exists only while ACTIVE.
    const membership = await tx.clubMembership.findFirst({
      where: { clubId: trainer.clubId, athleteId: request.achievement.athleteId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (membership === null) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This athlete no longer has an active membership with your club',
      });
    }
    const { count } = await tx.achievementCertificationRequest.updateMany({
      where: { id: input.requestId, status: 'PENDING' },
      data: {
        status,
        decidedByClubTrainerId: trainer.id,
        decidedAt: new Date(),
        rejectionReason: input.decision === 'REJECT' ? input.rejectionReason : null,
      },
    });
    if (count === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: NOT_PENDING });
    }
    await tx.athleteAchievement.update({
      where: { id: request.achievementId },
      data: { verificationStatus: status === 'APPROVED' ? 'VERIFIED' : 'REJECTED' },
      select: { id: true },
    });
    return { id: input.requestId, status };
  });

  await notify(
    notifier,
    'CERTIFICATION_DECIDED',
    [request.achievement.athlete.userAccountId],
    input.requestId,
  );
  return result;
}
