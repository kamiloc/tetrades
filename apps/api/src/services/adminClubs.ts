/**
 * Club administration by platform admins (ADR-017; club-administration spec).
 *
 * Admins create clubs, edit name / country / city (never the slug), list and
 * read them, and take them out of service by deactivation. Clubs are never
 * deleted. Every successful write records an AdminActionLog row in the same
 * transaction, so a rolled-back write leaves no record, and logs one Pino
 * `info` line with the requestId, action and target id. Neither ever holds an
 * email, a field value or L2 data.
 *
 * Deactivation (design D7) locks the club FOR UPDATE first — the head of the
 * global lock order club → club_trainer → membership → achievement → request —
 * so trainer writes and certification requests already holding the club
 * FOR SHARE finish first, and later ones find the club inactive. In the same
 * transaction it closes the club's open items:
 *   - PENDING_ATHLETE_CONFIRMATION memberships → REJECTED (ADR-013 §5 as
 *     amended by ADR-017: a system-initiated path to REJECTED),
 *   - PENDING certification requests → CANCELLED, achievements → UNVERIFIED,
 *   - PENDING trainer invitations → REVOKED.
 * ACTIVE memberships, metric entries, VERIFIED achievements and trainer rows
 * are untouched. CLUB_INVITATION_CLOSED pushes are enqueued after commit with
 * ids only; a failed enqueue is logged and never fails the deactivation.
 */
import { QUEUE_NAMES } from '@packages/queue';
import type {
  AdminActionMetadata,
  AdminClubListOutput,
  AdminClubOutput,
  CreateClubInput,
  DeactivateClubOutput,
  ListAdminClubsInput,
  UpdateClubInput,
} from '@packages/validators';
import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { JobEnqueuer } from '../lib/jobs.js';
import { cursorArgs, toPage } from '../lib/pagination.js';

import { lockAchievements } from './certification.js';
import { clubIsActive } from './clubOutput.js';

const UNIQUE_VIOLATION = 'P2002';
const CLUB_NOT_FOUND = 'Club not found';

/** The acting admin and request plumbing, from adminProcedure's context. */
export interface AdminActor {
  admin: { userAccountId: string };
  requestId: string;
  log: {
    info: (obj: Record<string, unknown>, msg?: string) => void;
    warn: (obj: Record<string, unknown>, msg?: string) => void;
  };
}

/** Deactivation also needs the job port for closed-invitation pushes. */
export interface AdminActorWithJobs extends AdminActor {
  jobs: JobEnqueuer;
}

const adminClubSelect = {
  id: true,
  slug: true,
  name: true,
  countryCode: true,
  city: true,
  deactivatedAt: true,
  createdAt: true,
  _count: { select: { trainers: { where: { revokedAt: null } } } },
} satisfies Prisma.ClubSelect;

type AdminClubRow = Prisma.ClubGetPayload<{ select: typeof adminClubSelect }>;

function toAdminClub({ _count, ...club }: AdminClubRow): AdminClubOutput {
  return { ...club, isActive: clubIsActive(club), activeTrainerCount: _count.trainers };
}

/**
 * Appends the admin action record inside the write's transaction. `metadata`
 * is typed to ids, counts and field names only (adminActionMetadataSchema).
 */
export async function recordAdminAction(
  tx: Prisma.TransactionClient,
  actor: AdminActor,
  entry: {
    action: Prisma.AdminActionLogCreateInput['action'];
    targetType: 'club' | 'club_trainer' | 'club_trainer_invitation';
    targetId: string;
    metadata?: AdminActionMetadata;
  },
): Promise<void> {
  await tx.adminActionLog.create({
    data: {
      actorUserAccountId: actor.admin.userAccountId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      requestId: actor.requestId,
      metadata: entry.metadata ?? {},
    },
    select: { id: true },
  });
}

function logAdminAction(actor: AdminActor, action: string, targetId: string): void {
  actor.log.info(
    { event: 'admin_action', requestId: actor.requestId, action, targetId },
    'admin action recorded',
  );
}

/** Locks the club row FOR UPDATE; NOT_FOUND when it does not exist. */
async function lockClubForUpdate(
  tx: Prisma.TransactionClient,
  clubId: string,
): Promise<{ deactivatedAt: Date | null }> {
  // Approved raw SQL (design D7): Prisma cannot express row locks.
  const rows = await tx.$queryRaw<{ deactivated_at: Date | null }[]>`
    SELECT deactivated_at FROM clubs WHERE id = ${clubId} FOR UPDATE`;
  const row = rows[0];
  if (row === undefined) {
    throw new TRPCError({ code: 'NOT_FOUND', message: CLUB_NOT_FOUND });
  }
  return { deactivatedAt: row.deactivated_at };
}

export async function createClub(
  prisma: PrismaClient,
  actor: AdminActor,
  input: CreateClubInput,
): Promise<AdminClubOutput> {
  try {
    const club = await prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          slug: input.slug,
          name: input.name,
          countryCode: input.countryCode,
          city: input.city ?? null,
        },
        select: adminClubSelect,
      });
      await recordAdminAction(tx, actor, {
        action: 'CLUB_CREATED',
        targetType: 'club',
        targetId: created.id,
      });
      return created;
    });
    logAdminAction(actor, 'CLUB_CREATED', club.id);
    return toAdminClub(club);
  } catch (error) {
    // Slugs are unique across active and deactivated clubs alike.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Another club already uses this slug' });
    }
    throw error;
  }
}

export async function updateClub(
  prisma: PrismaClient,
  actor: AdminActor,
  input: UpdateClubInput,
): Promise<AdminClubOutput> {
  const { clubId, ...changes } = input;
  const changedFields = (['name', 'countryCode', 'city'] as const).filter(
    (field) => changes[field] !== undefined,
  );
  if (changedFields.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing to update' });
  }

  const club = await prisma.$transaction(async (tx) => {
    await lockClubForUpdate(tx, clubId);
    const updated = await tx.club.update({
      where: { id: clubId },
      data: changes,
      select: adminClubSelect,
    });
    await recordAdminAction(tx, actor, {
      action: 'CLUB_UPDATED',
      targetType: 'club',
      targetId: clubId,
      metadata: { changedFields },
    });
    return updated;
  });
  logAdminAction(actor, 'CLUB_UPDATED', clubId);
  return toAdminClub(club);
}

export async function listClubs(
  prisma: PrismaClient,
  input: ListAdminClubsInput,
): Promise<AdminClubListOutput> {
  const where: Prisma.ClubWhereInput =
    input.status === 'ACTIVE'
      ? { deactivatedAt: null }
      : input.status === 'DEACTIVATED'
        ? { deactivatedAt: { not: null } }
        : {};
  const rows = await prisma.club.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: adminClubSelect,
  });
  return toPage(rows.map(toAdminClub), input.take, (c) => c.id);
}

export async function getClub(prisma: PrismaClient, clubId: string): Promise<AdminClubOutput> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: adminClubSelect });
  if (club === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: CLUB_NOT_FOUND });
  }
  return toAdminClub(club);
}

export async function deactivateClub(
  prisma: PrismaClient,
  actor: AdminActorWithJobs,
  clubId: string,
): Promise<DeactivateClubOutput> {
  const outcome = await prisma.$transaction(async (tx) => {
    const { deactivatedAt } = await lockClubForUpdate(tx, clubId);
    if (deactivatedAt !== null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This club is already deactivated' });
    }
    const now = new Date();
    await tx.club.update({ where: { id: clubId }, data: { deactivatedAt: now }, select: { id: true } });

    // Memberships: close every pending invitation of the club.
    // The conditional update skips a row an athlete answered concurrently;
    // the rows this transaction closed are exactly those now REJECTED with
    // this transaction's respondedAt, so counts and pushes match the writes.
    const candidates = await tx.clubMembership.findMany({
      where: { clubId, status: 'PENDING_ATHLETE_CONFIRMATION' },
      select: { id: true },
    });
    let invitations: { id: string; athlete: { userAccountId: string } }[] = [];
    if (candidates.length > 0) {
      const candidateIds = candidates.map((m) => m.id);
      await tx.clubMembership.updateMany({
        where: { id: { in: candidateIds }, status: 'PENDING_ATHLETE_CONFIRMATION' },
        data: { status: 'REJECTED', respondedAt: now },
      });
      invitations = await tx.clubMembership.findMany({
        where: { id: { in: candidateIds }, status: 'REJECTED', respondedAt: now },
        select: { id: true, athlete: { select: { userAccountId: true } } },
      });
    }

    // Certification requests: lock the achievements, then re-read which
    // requests are still PENDING (a concurrent leave or withdrawal that held
    // an achievement lock may have closed some) and cancel exactly those.
    const requestCandidates = await tx.achievementCertificationRequest.findMany({
      where: { clubId, status: 'PENDING' },
      select: { achievementId: true },
    });
    await lockAchievements(
      tx,
      requestCandidates.map((c) => c.achievementId),
    );
    const pending = await tx.achievementCertificationRequest.findMany({
      where: { clubId, status: 'PENDING' },
      select: { id: true, achievementId: true },
    });
    if (pending.length > 0) {
      await tx.achievementCertificationRequest.updateMany({
        where: { id: { in: pending.map((r) => r.id) }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      await tx.athleteAchievement.updateMany({
        where: { id: { in: pending.map((r) => r.achievementId) } },
        data: { verificationStatus: 'UNVERIFIED' },
      });
    }

    // Trainer invitations: revoke every PENDING one (expired included).
    const { count: revokedTrainerInvitations } = await tx.clubTrainerInvitation.updateMany({
      where: { clubId, status: 'PENDING' },
      data: { status: 'REVOKED', respondedAt: now },
    });

    const counts = {
      cancelledCertificationRequests: pending.length,
      rejectedMembershipInvitations: invitations.length,
      revokedTrainerInvitations,
    };
    await recordAdminAction(tx, actor, {
      action: 'CLUB_DEACTIVATED',
      targetType: 'club',
      targetId: clubId,
      metadata: counts,
    });
    const club = await tx.club.findUniqueOrThrow({ where: { id: clubId }, select: adminClubSelect });
    return { club: toAdminClub(club), counts, invitations };
  });
  logAdminAction(actor, 'CLUB_DEACTIVATED', clubId);

  // After commit: one push per closed invitation, ids only, naming no club.
  for (const invitation of outcome.invitations) {
    try {
      await actor.jobs.enqueue(QUEUE_NAMES.NOTIFICATIONS, {
        userAccountId: invitation.athlete.userAccountId,
        notificationType: 'CLUB_INVITATION_CLOSED',
        subjectId: invitation.id,
        requestId: actor.requestId,
      });
    } catch (error) {
      actor.log.warn(
        {
          event: 'club_invitation_closed_notification_not_enqueued',
          requestId: actor.requestId,
          membershipId: invitation.id,
          error: error instanceof Error ? { name: error.name } : 'unknown',
        },
        'club deactivated; closed-invitation push could not be scheduled',
      );
    }
  }

  return { club: outcome.club, ...outcome.counts };
}

export async function reactivateClub(
  prisma: PrismaClient,
  actor: AdminActor,
  clubId: string,
): Promise<AdminClubOutput> {
  const club = await prisma.$transaction(async (tx) => {
    const { deactivatedAt } = await lockClubForUpdate(tx, clubId);
    if (deactivatedAt === null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This club is already active' });
    }
    // Only the flag changes: whatever the deactivation closed stays closed.
    const updated = await tx.club.update({
      where: { id: clubId },
      data: { deactivatedAt: null },
      select: adminClubSelect,
    });
    await recordAdminAction(tx, actor, {
      action: 'CLUB_REACTIVATED',
      targetType: 'club',
      targetId: clubId,
    });
    return updated;
  });
  logAdminAction(actor, 'CLUB_REACTIVATED', clubId);
  return toAdminClub(club);
}
