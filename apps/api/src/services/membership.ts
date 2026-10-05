/**
 * Club membership lifecycle (ADR-013 §5, design D2).
 *
 * Every transition goes through transitionMembership(): it checks the actor,
 * the current status against the shared-logic transition table, and then
 * applies a conditional updateMany on the expected current status, so two
 * concurrent responses can never both succeed. The DB trigger
 * (supabase/constraints/club_membership_transitions.sql) enforces the same
 * table for every writer; the partial unique index enforces one open
 * membership per (club, athlete).
 */
import { QUEUE_NAMES } from '@packages/queue';
import {
  canTransitionClubMembership,
  OPEN_CLUB_MEMBERSHIP_STATUSES,
} from '@packages/shared-logic';
import type {
  ClubMembershipMutationOutput,
  ClubMembershipOwnerOutput,
  ClubMembershipStatus,
  ClubRosterEntryOutput,
  PaginationInput,
} from '@packages/validators';
import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { JobEnqueuer } from '../lib/jobs.js';
import { cursorArgs, toPage, type Page } from '../lib/pagination.js';

import type { Viewer } from './viewer.js';

const UNIQUE_VIOLATION = 'P2002';

/** A ClubTrainer row already proven to belong to the caller. */
export interface ClubTrainerRef {
  id: string;
  clubId: string;
}

/**
 * The caller's ClubTrainer row for `clubId` (ADR-013: the only source of
 * trainer authority). NOT_FOUND for an unknown club, FORBIDDEN when the
 * caller does not train it. Used by trainerProcedure.
 */
export async function requireClubTrainer(
  prisma: PrismaClient,
  viewer: Viewer,
  clubId: string,
): Promise<ClubTrainerRef> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (club === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Club not found' });
  }
  const trainer = await prisma.clubTrainer.findUnique({
    where: { clubId_userAccountId: { clubId, userAccountId: viewer.userAccountId } },
    select: { id: true },
  });
  if (trainer === null) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a trainer of this club' });
  }
  return { id: trainer.id, clubId };
}

/** Where to announce a new invitation; omitted in service-level tests. */
export interface InvitationNotifier {
  jobs: JobEnqueuer;
  requestId: string;
  log: { warn: (obj: Record<string, unknown>, msg?: string) => void };
}

export async function inviteAthlete(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: { athleteId: string },
  notifier?: InvitationNotifier,
): Promise<ClubMembershipMutationOutput> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: input.athleteId },
    select: { id: true, userAccountId: true },
  });
  if (athlete === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found' });
  }

  const open = await prisma.clubMembership.findFirst({
    where: {
      clubId: trainer.clubId,
      athleteId: input.athleteId,
      status: { in: [...OPEN_CLUB_MEMBERSHIP_STATUSES] },
    },
    select: { id: true },
  });
  if (open !== null) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This athlete already has a pending or active membership with the club',
    });
  }

  let membership: ClubMembershipMutationOutput;
  try {
    membership = await prisma.clubMembership.create({
      data: {
        clubId: trainer.clubId,
        athleteId: input.athleteId,
        invitedByClubTrainerId: trainer.id,
        status: 'PENDING_ATHLETE_CONFIRMATION',
      },
      select: { id: true, status: true },
    });
  } catch (error) {
    // A concurrent invitation won the race on the partial unique index.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This athlete already has a pending or active membership with the club',
      });
    }
    throw error;
  }

  // Persisted first; a failed enqueue never fails the invitation (spec).
  if (notifier !== undefined) {
    try {
      await notifier.jobs.enqueue(QUEUE_NAMES.NOTIFICATIONS, {
        userAccountId: athlete.userAccountId,
        notificationType: 'CLUB_INVITATION',
        subjectId: membership.id,
        requestId: notifier.requestId,
      });
    } catch (error) {
      notifier.log.warn(
        {
          event: 'club_invitation_notification_not_enqueued',
          requestId: notifier.requestId,
          membershipId: membership.id,
          error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        },
        'invitation created; push notification could not be scheduled',
      );
    }
  }
  return membership;
}

async function transitionMembership(
  prisma: PrismaClient,
  viewer: Viewer,
  membershipId: string,
  to: ClubMembershipStatus,
): Promise<ClubMembershipMutationOutput> {
  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, status: true, athleteId: true },
  });
  if (membership === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
  }
  // Only the athlete acts on their membership (no club-initiated transitions).
  if (viewer.athleteId === null || viewer.athleteId !== membership.athleteId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the athlete can change this membership',
    });
  }
  if (!canTransitionClubMembership(membership.status, to)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This membership can no longer be changed that way',
    });
  }

  const now = new Date();
  const { count } = await prisma.clubMembership.updateMany({
    where: { id: membershipId, status: membership.status },
    data: {
      status: to,
      ...(membership.status === 'PENDING_ATHLETE_CONFIRMATION' ? { respondedAt: now } : {}),
      ...(to === 'COMPLETED' ? { endedAt: now } : {}),
    },
  });
  if (count === 0) {
    // Another request changed the status between the read and the update.
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This membership was changed by another request',
    });
  }
  return { id: membershipId, status: to };
}

export function respondToInvitation(
  prisma: PrismaClient,
  viewer: Viewer,
  input: { membershipId: string; status: 'ACTIVE' | 'REJECTED' },
): Promise<ClubMembershipMutationOutput> {
  return transitionMembership(prisma, viewer, input.membershipId, input.status);
}

export function leaveClub(
  prisma: PrismaClient,
  viewer: Viewer,
  input: { membershipId: string },
): Promise<ClubMembershipMutationOutput> {
  return transitionMembership(prisma, viewer, input.membershipId, 'COMPLETED');
}

/** The athlete's own memberships in every status, newest first. */
export async function listMyMemberships(
  prisma: PrismaClient,
  athleteId: string,
  input: PaginationInput,
): Promise<Page<ClubMembershipOwnerOutput>> {
  const rows = await prisma.clubMembership.findMany({
    where: { athleteId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      status: true,
      createdAt: true,
      respondedAt: true,
      endedAt: true,
      club: { select: { id: true, slug: true, name: true, countryCode: true, city: true } },
    },
  });
  return toPage(rows, input.take, (r) => r.id);
}

/**
 * A trainer's roster (trainer-access-boundary spec): ACTIVE memberships of
 * the club, plus pending invitations this trainer sent. Completed, rejected,
 * and other trainers' pending invitations are excluded. Athlete identity is
 * limited to L0 fields.
 */
export async function listRoster(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: PaginationInput,
): Promise<Page<ClubRosterEntryOutput>> {
  const rows = await prisma.clubMembership.findMany({
    where: {
      clubId: trainer.clubId,
      OR: [
        { status: 'ACTIVE' },
        { status: 'PENDING_ATHLETE_CONFIRMATION', invitedByClubTrainerId: trainer.id },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      status: true,
      createdAt: true,
      respondedAt: true,
      athlete: { select: { id: true, slug: true, displayName: true } },
    },
  });
  return toPage(rows, input.take, (r) => r.id);
}
