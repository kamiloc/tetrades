/**
 * Trainer provisioning (ADR-017; trainer-provisioning spec, design D3/D4).
 *
 * Admin side: invite an email to one club, revoke a pending invitation,
 * revoke a trainer, and list a club's trainers and invitations. Every write
 * records an AdminActionLog row (ids and counts only, never the email) in the
 * same transaction.
 *
 * Invitee side: a signed-in user sees, accepts or declines invitations
 * addressed to their CONFIRMED session email (ctx.userEmail, lowercased —
 * null when Supabase has not confirmed it). Error codes are deliberate:
 *   - NOT_FOUND: the invitation is not available to this caller (unknown id,
 *     other or unconfirmed email, expired, no longer pending, or its club
 *     was deactivated). Ids can't be probed.
 *   - FORBIDDEN: this account cannot be a trainer (it has an athlete profile
 *     or its role is not ATHLETE, i.e. ADMIN or SYSTEM; one capacity per
 *     account, D12).
 * Accepting creates the ClubTrainer row, or clears revokedAt on an existing
 * one ("return after revocation"), so there is one row per (club, user).
 * A revocation voids every invitation created before it: only an invitation
 * issued after the revocation can restore access. Restoring redacts the
 * earlier accepted invitations of that (club, account), which the new one
 * supersedes, so their emails can't outlive the 90-day rule.
 *
 * Emails are L1: never logged, never in errors, never in the action log.
 */
import { trainerInvitationState } from '@packages/shared-logic';
import {
  TRAINER_INVITATION_TTL_DAYS,
  type AcceptTrainerInvitationOutput,
  type AdminClubTrainerListOutput,
  type AdminTrainerInvitationListOutput,
  type InviteTrainerInput,
  type InviteTrainerOutput,
  type ListClubTrainerInvitationsInput,
  type ListClubTrainersInput,
  type MyTrainerInvitationListOutput,
  type RevokeClubTrainerOutput,
  type TrainerInvitationMutationOutput,
} from '@packages/validators';
import { Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { cursorArgs, toPage } from '../lib/pagination.js';

import { recordAdminAction, type AdminActor } from './adminClubs.js';
import { withIsActive } from './clubOutput.js';
import { redactSupersededAcceptedInvitations } from './invitationRedaction.js';
import {
  lockActiveClub,
  lockClubForShare,
  lockTrainerForUpdate,
  lockTrainerRowForAccept,
} from './locks.js';

const UNIQUE_VIOLATION = 'P2002';
const DAY_MS = 24 * 60 * 60 * 1000;
const CLUB_NOT_FOUND = 'Club not found';
const NOT_AVAILABLE = 'This invitation is no longer available';
const CANNOT_BE_TRAINER =
  'This account cannot be a trainer. Sign in with a different email to accept the invitation.';
const MY_INVITATIONS_LIMIT = 50;

/** The invitee, from protectedProcedure's context. */
export interface InvitationCaller {
  supabaseUserId: string;
  /** Confirmed, lowercased session email, or null. */
  email: string | null;
}

async function requireClub(
  prisma: PrismaClient | Prisma.TransactionClient,
  clubId: string,
): Promise<{ deactivatedAt: Date | null }> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { deactivatedAt: true },
  });
  if (club === null) throw new TRPCError({ code: 'NOT_FOUND', message: CLUB_NOT_FOUND });
  return club;
}

function logAdminAction(actor: AdminActor, action: string, targetId: string): void {
  actor.log.info(
    { event: 'admin_action', requestId: actor.requestId, action, targetId },
    'admin action recorded',
  );
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function inviteTrainer(
  prisma: PrismaClient,
  actor: AdminActor,
  input: InviteTrainerInput,
): Promise<InviteTrainerOutput> {
  await requireClub(prisma, input.clubId);
  const now = new Date();

  let invitation: { id: string; expiresAt: Date };
  try {
    invitation = await prisma.$transaction(async (tx) => {
      // FOR SHARE: a deactivation waits for this invite, or this invite sees
      // the club inactive (lock order head, design D7).
      if (!(await lockActiveClub(tx, input.clubId))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Trainers cannot be invited to a deactivated club',
        });
      }

      // Already a non-revoked trainer of this club through this address.
      const accepted = await tx.clubTrainerInvitation.findMany({
        where: { clubId: input.clubId, email: input.email, status: 'ACCEPTED' },
        select: { acceptedByUserAccountId: true },
      });
      const acceptedBy = accepted
        .map((a) => a.acceptedByUserAccountId)
        .filter((id): id is string => id !== null);
      if (acceptedBy.length > 0) {
        const active = await tx.clubTrainer.count({
          where: { clubId: input.clubId, userAccountId: { in: acceptedBy }, revokedAt: null },
        });
        if (active > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This email already belongs to a trainer of the club',
          });
        }
      }

      // An expired PENDING row still holds the unique slot: close it first.
      const expired = await tx.clubTrainerInvitation.findFirst({
        where: {
          clubId: input.clubId,
          email: input.email,
          status: 'PENDING',
          expiresAt: { lte: now },
        },
        select: { id: true },
      });
      if (expired !== null) {
        await tx.clubTrainerInvitation.updateMany({
          where: { id: expired.id, status: 'PENDING' },
          data: { status: 'REVOKED', respondedAt: now },
        });
      }

      const created = await tx.clubTrainerInvitation.create({
        data: {
          clubId: input.clubId,
          email: input.email,
          invitedByUserAccountId: actor.admin.userAccountId,
          expiresAt: new Date(now.getTime() + TRAINER_INVITATION_TTL_DAYS * DAY_MS),
        },
        select: { id: true, expiresAt: true },
      });
      await recordAdminAction(tx, actor, {
        action: 'TRAINER_INVITED',
        targetType: 'club_trainer_invitation',
        targetId: created.id,
        metadata: {
          clubId: input.clubId,
          ...(expired === null ? {} : { closedExpiredInvitationId: expired.id }),
        },
      });
      return created;
    });
  } catch (error) {
    // The (club_id, lower(email)) partial unique index: one PENDING per pair.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This email already has a pending invitation to the club',
      });
    }
    throw error;
  }
  logAdminAction(actor, 'TRAINER_INVITED', invitation.id);
  return { id: invitation.id, expiresAt: invitation.expiresAt, state: 'PENDING' };
}

export async function revokeTrainerInvitation(
  prisma: PrismaClient,
  actor: AdminActor,
  invitationId: string,
): Promise<TrainerInvitationMutationOutput> {
  const invitation = await prisma.clubTrainerInvitation.findUnique({
    where: { id: invitationId },
    select: { clubId: true },
  });
  if (invitation === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
  }
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.clubTrainerInvitation.updateMany({
      where: { id: invitationId, status: 'PENDING' },
      data: { status: 'REVOKED', respondedAt: new Date() },
    });
    if (count === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invitation is no longer pending' });
    }
    await recordAdminAction(tx, actor, {
      action: 'TRAINER_INVITATION_REVOKED',
      targetType: 'club_trainer_invitation',
      targetId: invitationId,
      metadata: { clubId: invitation.clubId },
    });
  });
  logAdminAction(actor, 'TRAINER_INVITATION_REVOKED', invitationId);
  return { id: invitationId, state: 'REVOKED' };
}

export async function revokeTrainer(
  prisma: PrismaClient,
  actor: AdminActor,
  clubTrainerId: string,
): Promise<RevokeClubTrainerOutput> {
  const trainer = await prisma.clubTrainer.findUnique({
    where: { id: clubTrainerId },
    select: { clubId: true },
  });
  if (trainer === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Trainer not found' });
  }
  const revokedAt = await prisma.$transaction(async (tx) => {
    // Lock order (D7): club FOR SHARE, then the trainer row FOR UPDATE, which
    // waits for every in-flight write of this trainer to commit.
    if ((await lockClubForShare(tx, trainer.clubId)) === null) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Trainer not found' });
    }
    const row = await lockTrainerForUpdate(tx, clubTrainerId);
    if (row === null) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Trainer not found' });
    }
    if (row.isRevoked) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This trainer is already revoked' });
    }
    const now = new Date();
    // The row is kept (never deleted) so past entries and decisions stay
    // attributed to it.
    await tx.clubTrainer.update({
      where: { id: clubTrainerId },
      data: { revokedAt: now },
      select: { id: true },
    });
    await recordAdminAction(tx, actor, {
      action: 'TRAINER_REVOKED',
      targetType: 'club_trainer',
      targetId: clubTrainerId,
      metadata: { clubId: trainer.clubId },
    });
    return now;
  });
  logAdminAction(actor, 'TRAINER_REVOKED', clubTrainerId);
  return { id: clubTrainerId, status: 'REVOKED', revokedAt };
}

/**
 * A club's trainers, active and revoked, newest first. `invitedEmail` is the
 * address of the latest ACCEPTED invitation that created or restored the row
 * (the invited address, not necessarily the current sign-in email); null for
 * rows provisioned before invitations or whose invitation was redacted.
 */
/**
 * "Invited as" emails for trainer assignments: the address of the latest
 * ACCEPTED invitation for each (club, account), or null when there is none
 * (provisioned before invitations) or it was redacted. One query per page;
 * shared by listClubTrainers and the admin trainer directory.
 */
export async function resolveInvitedEmails(
  prisma: PrismaClient,
  pairs: readonly { clubId: string; userAccountId: string }[],
): Promise<(pair: { clubId: string; userAccountId: string }) => string | null> {
  const keyOf = (clubId: string, userAccountId: string) => `${clubId}:${userAccountId}`;
  const invitations =
    pairs.length === 0
      ? []
      : await prisma.clubTrainerInvitation.findMany({
          where: {
            status: 'ACCEPTED',
            OR: pairs.map((p) => ({ clubId: p.clubId, acceptedByUserAccountId: p.userAccountId })),
          },
          orderBy: { respondedAt: 'desc' },
          select: { clubId: true, acceptedByUserAccountId: true, email: true, redactedAt: true },
        });
  const emailOf = new Map<string, string | null>();
  for (const inv of invitations) {
    if (inv.acceptedByUserAccountId === null) continue;
    const key = keyOf(inv.clubId, inv.acceptedByUserAccountId);
    // Newest first: keep the first one seen.
    if (!emailOf.has(key)) emailOf.set(key, inv.redactedAt === null ? inv.email : null);
  }
  return (pair) => emailOf.get(keyOf(pair.clubId, pair.userAccountId)) ?? null;
}

export async function listClubTrainers(
  prisma: PrismaClient,
  input: ListClubTrainersInput,
): Promise<AdminClubTrainerListOutput> {
  await requireClub(prisma, input.clubId);
  const rows = await prisma.clubTrainer.findMany({
    where: { clubId: input.clubId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: { id: true, userAccountId: true, createdAt: true, revokedAt: true },
  });
  const invitedEmail = await resolveInvitedEmails(
    prisma,
    rows.map((r) => ({ clubId: input.clubId, userAccountId: r.userAccountId })),
  );
  return toPage(
    rows.map(({ userAccountId, ...row }) => ({
      ...row,
      status: row.revokedAt === null ? ('ACTIVE' as const) : ('REVOKED' as const),
      invitedEmail: invitedEmail({ clubId: input.clubId, userAccountId }),
    })),
    input.take,
    (r) => r.id,
  );
}

/** A club's invitations, newest first, with the derived state (EXPIRED included). */
export async function listClubTrainerInvitations(
  prisma: PrismaClient,
  input: ListClubTrainerInvitationsInput,
  now: Date = new Date(),
): Promise<AdminTrainerInvitationListOutput> {
  await requireClub(prisma, input.clubId);
  const rows = await prisma.clubTrainerInvitation.findMany({
    where: { clubId: input.clubId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      respondedAt: true,
      redactedAt: true,
      createdAt: true,
    },
  });
  return toPage(
    rows.map(({ email, status, redactedAt, ...row }) => ({
      ...row,
      email: redactedAt === null ? email : null,
      state: trainerInvitationState(status, row.expiresAt, now),
    })),
    input.take,
    (r) => r.id,
  );
}

// ── Invitee ──────────────────────────────────────────────────────────────────

/** Pending, unexpired invitations to an active club for the confirmed email. */
export async function listMyInvitations(
  prisma: PrismaClient,
  caller: InvitationCaller,
): Promise<MyTrainerInvitationListOutput> {
  if (caller.email === null) return { items: [] };
  const rows = await prisma.clubTrainerInvitation.findMany({
    where: {
      email: caller.email,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
      club: { deactivatedAt: null },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MY_INVITATIONS_LIMIT,
    select: {
      id: true,
      expiresAt: true,
      club: {
        select: {
          id: true,
          slug: true,
          name: true,
          countryCode: true,
          city: true,
          deactivatedAt: true,
        },
      },
    },
  });
  return { items: rows.map((r) => ({ ...r, club: withIsActive(r.club) })) };
}

/**
 * The invitation, when it is addressed to the caller's confirmed email and
 * still open; NOT_FOUND otherwise (never revealing which check failed).
 */
async function requireOpenInvitation(
  prisma: PrismaClient,
  caller: InvitationCaller,
  invitationId: string,
): Promise<{ clubId: string; createdAt: Date }> {
  if (caller.email === null) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
  const invitation = await prisma.clubTrainerInvitation.findUnique({
    where: { id: invitationId },
    select: { clubId: true, email: true, status: true, expiresAt: true, createdAt: true },
  });
  if (
    invitation === null ||
    invitation.email !== caller.email ||
    trainerInvitationState(invitation.status, invitation.expiresAt, new Date()) !== 'PENDING'
  ) {
    throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
  }
  return { clubId: invitation.clubId, createdAt: invitation.createdAt };
}

/**
 * Moves the invitation out of PENDING only if it is still PENDING, unexpired
 * and addressed to `email`; NOT_FOUND when a concurrent change got there first.
 */
async function closeOpenInvitation(
  tx: Prisma.TransactionClient,
  invitationId: string,
  email: string,
  data: Prisma.ClubTrainerInvitationUpdateManyMutationInput & { acceptedByUserAccountId?: string },
): Promise<void> {
  const now = new Date();
  const { count } = await tx.clubTrainerInvitation.updateMany({
    where: { id: invitationId, email, status: 'PENDING', expiresAt: { gt: now } },
    data: { ...data, respondedAt: now },
  });
  if (count === 0) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
}

export async function acceptInvitation(
  prisma: PrismaClient,
  caller: InvitationCaller,
  invitationId: string,
): Promise<AcceptTrainerInvitationOutput> {
  const { clubId, createdAt } = await requireOpenInvitation(prisma, caller, invitationId);
  const email = caller.email ?? '';

  await prisma.$transaction(async (tx) => {
    // Club first (lock order, D7). Deactivation already revoked every pending
    // invitation of the club, so an inactive club means "not available".
    if (!(await lockActiveClub(tx, clubId))) {
      throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
    }

    // The auth bootstrap trigger normally created the account; upsert keeps
    // this correct when it has not been applied (same as athlete.bootstrap).
    const account = await tx.userAccount.upsert({
      where: { supabaseUserId: caller.supabaseUserId },
      create: { supabaseUserId: caller.supabaseUserId, role: 'ATHLETE', status: 'ACTIVE' },
      update: {},
      select: { id: true, role: true, status: true, athlete: { select: { id: true } } },
    });
    // One capacity per account (D12): only an ATHLETE-role account with no
    // athlete profile can be a trainer (not ADMIN, not SYSTEM). The
    // invitation stays PENDING.
    if (account.athlete !== null || account.role !== 'ATHLETE') {
      throw new TRPCError({ code: 'FORBIDDEN', message: CANNOT_BE_TRAINER });
    }
    if (account.status === 'PENDING') {
      await tx.userAccount.update({
        where: { id: account.id },
        data: { status: 'ACTIVE' },
        select: { id: true },
      });
    }

    // Trainer row next (club → club_trainer, the order revokeTrainer uses),
    // so an accept and a revocation of the same row serialize.
    const existing = await lockTrainerRowForAccept(tx, clubId, account.id);
    if (existing !== null && existing.revokedAt !== null) {
      // A revocation voids every invitation created before it.
      if (existing.revokedAt >= createdAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
      }
      // Restoring: the earlier accepted invitations are superseded by this one.
      await redactSupersededAcceptedInvitations(tx, clubId, account.id, new Date());
    }

    // One row per (club, user): create it, or restore a revoked one.
    await tx.clubTrainer.upsert({
      where: { clubId_userAccountId: { clubId, userAccountId: account.id } },
      create: { clubId, userAccountId: account.id },
      update: { revokedAt: null },
      select: { id: true },
    });
    await closeOpenInvitation(tx, invitationId, email, {
      status: 'ACCEPTED',
      acceptedByUserAccountId: account.id,
    });
  });
  return { id: invitationId, state: 'ACCEPTED', clubId };
}

export async function declineInvitation(
  prisma: PrismaClient,
  caller: InvitationCaller,
  invitationId: string,
): Promise<TrainerInvitationMutationOutput> {
  const { clubId } = await requireOpenInvitation(prisma, caller, invitationId);
  const email = caller.email ?? '';
  await prisma.$transaction(async (tx) => {
    if (!(await lockActiveClub(tx, clubId))) {
      throw new TRPCError({ code: 'NOT_FOUND', message: NOT_AVAILABLE });
    }
    await closeOpenInvitation(tx, invitationId, email, { status: 'DECLINED' });
  });
  return { id: invitationId, state: 'DECLINED' };
}
