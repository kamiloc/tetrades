/**
 * Trainer invitation email redaction (ADR-017, design D13/D14).
 *
 * A redacted invitation keeps its status, club and dates; its email becomes
 * `redacted:<id>` and `redactedAt` is set, in one update. That is the only
 * email change supabase/constraints/club_trainer_invitation_transitions.sql
 * allows, and the marker is unique and lowercase, so it never collides with
 * the (club_id, lower(email)) index.
 */
import type { Prisma } from '@prisma/client';

export const redactedEmail = (invitationId: string): string => `redacted:${invitationId}`;

/**
 * Deletion path (D14): every invitation addressed to `email` — the deleted
 * athlete's confirmed address — is redacted, and a PENDING one is also
 * REVOKED. Runs inside the deletion transaction. Returns how many rows were
 * redacted. The email is never logged.
 */
export async function closeAndRedactInvitationsForEmail(
  tx: Prisma.TransactionClient,
  email: string,
  now: Date,
): Promise<number> {
  const rows = await tx.clubTrainerInvitation.findMany({
    where: { email, redactedAt: null },
    select: { id: true, status: true },
  });
  for (const row of rows) {
    await tx.clubTrainerInvitation.update({
      where: { id: row.id },
      data: {
        email: redactedEmail(row.id),
        redactedAt: now,
        ...(row.status === 'PENDING' ? { status: 'REVOKED' as const, respondedAt: now } : {}),
      },
      select: { id: true },
    });
  }
  return rows.length;
}
