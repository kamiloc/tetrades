/**
 * Row locks for club lifecycle and trainer revocation (ADR-017, design D7).
 *
 * Global lock order, shared by every writer so none can deadlock:
 *   club → club_trainer → membership → achievement → request
 * (the last three are lockActiveMembership / lockAchievements in
 * services/certification.ts).
 *
 * Trainer writes (inviteAthlete, reportEntry, decideCertification) call
 * lockActiveClub then lockActiveTrainer first inside their transaction;
 * requestCertification and an athlete accepting a membership call
 * lockActiveClub; trainer-invitation accept calls lockActiveClub, then
 * lockTrainerRowForAccept.
 * deactivateClub takes the club row FOR UPDATE and revokeTrainer takes the
 * club FOR SHARE then the trainer row FOR UPDATE, so a trainer write either
 * commits before the revocation or deactivation (which waits on its lock),
 * or re-reads the row after it committed, finds it gone, and fails. The same
 * holds for a membership accept against deactivation, and for a trainer
 * invitation accept against revocation (both lock the trainer row FOR
 * UPDATE).
 *
 * Prisma cannot express row locks; these are approved raw SQL ($queryRaw,
 * parameterized tagged templates only).
 */
import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import type { ClubTrainerRef } from './membership.js';

/** One FORBIDDEN message for no row, a revoked row, or a deactivated club. */
export const NOT_A_TRAINER_MESSAGE = 'You are not a trainer of this club';

/**
 * Locks the club FOR SHARE when it exists and is active. Returns false for an
 * unknown or deactivated club (the caller decides the error).
 */
export async function lockActiveClub(
  tx: Prisma.TransactionClient,
  clubId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM clubs
    WHERE id = ${clubId} AND deactivated_at IS NULL
    FOR SHARE`;
  return rows.length > 0;
}

/**
 * Locks the trainer row FOR SHARE when it exists and is not revoked. Returns
 * false for an unknown or revoked row.
 */
export async function lockActiveTrainer(
  tx: Prisma.TransactionClient,
  clubTrainerId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM club_trainers
    WHERE id = ${clubTrainerId} AND revoked_at IS NULL
    FOR SHARE`;
  return rows.length > 0;
}

/**
 * First step of every trainer write's transaction: lock the club, then the
 * caller's trainer row. FORBIDDEN, with requireClubTrainer's message, when
 * the club was deactivated or the row revoked since requireClubTrainer ran.
 */
export async function lockTrainerAuthority(
  tx: Prisma.TransactionClient,
  trainer: ClubTrainerRef,
): Promise<void> {
  if (!(await lockActiveClub(tx, trainer.clubId)) || !(await lockActiveTrainer(tx, trainer.id))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: NOT_A_TRAINER_MESSAGE });
  }
}

/**
 * Locks the club FOR SHARE whatever its status (revokeTrainer, design D7).
 * Returns null for an unknown club, otherwise whether it is active.
 */
export async function lockClubForShare(
  tx: Prisma.TransactionClient,
  clubId: string,
): Promise<{ isActive: boolean } | null> {
  const rows = await tx.$queryRaw<{ deactivated_at: Date | null }[]>`
    SELECT deactivated_at FROM clubs WHERE id = ${clubId} FOR SHARE`;
  const row = rows[0];
  return row === undefined ? null : { isActive: row.deactivated_at === null };
}

/**
 * Locks a trainer row FOR UPDATE (revokeTrainer, design D7). Waits for every
 * in-flight trainer write holding it FOR SHARE. Returns null for an unknown
 * row, otherwise whether it is already revoked.
 */
export async function lockTrainerForUpdate(
  tx: Prisma.TransactionClient,
  clubTrainerId: string,
): Promise<{ isRevoked: boolean } | null> {
  const rows = await tx.$queryRaw<{ revoked_at: Date | null }[]>`
    SELECT revoked_at FROM club_trainers WHERE id = ${clubTrainerId} FOR UPDATE`;
  const row = rows[0];
  return row === undefined ? null : { isRevoked: row.revoked_at !== null };
}

/**
 * Locks the caller's trainer row of a club FOR UPDATE, if it exists
 * (trainer-invitation accept, design D4/D7). Serializes with revokeTrainer,
 * which takes the same row FOR UPDATE. Returns null when there is no row,
 * otherwise its revocation time.
 */
export async function lockTrainerRowForAccept(
  tx: Prisma.TransactionClient,
  clubId: string,
  userAccountId: string,
): Promise<{ revokedAt: Date | null } | null> {
  const rows = await tx.$queryRaw<{ revoked_at: Date | null }[]>`
    SELECT revoked_at FROM club_trainers
    WHERE club_id = ${clubId} AND user_account_id = ${userAccountId}
    FOR UPDATE`;
  const row = rows[0];
  return row === undefined ? null : { revokedAt: row.revoked_at };
}
