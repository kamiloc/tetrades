/**
 * Resolves the caller (ctx.userId, a Supabase user id) to the internal ids
 * the club / metric / visibility services authorize against. Never trusts a
 * client-supplied id (AGENTS.md Auth rules).
 */
import type { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export interface Viewer {
  supabaseUserId: string;
  userAccountId: string;
  /** null for accounts without an athlete profile (e.g. trainer-only users). */
  athleteId: string | null;
}

/** null for anonymous callers and for authenticated users without an account row. */
export async function resolveViewer(
  prisma: PrismaClient,
  supabaseUserId: string | null,
): Promise<Viewer | null> {
  if (supabaseUserId === null) return null;
  const account = await prisma.userAccount.findUnique({
    where: { supabaseUserId },
    select: { id: true, athlete: { select: { id: true } } },
  });
  if (account === null) return null;
  return {
    supabaseUserId,
    userAccountId: account.id,
    athleteId: account.athlete?.id ?? null,
  };
}

/** For protected procedures that act as the caller's own athlete. */
export async function requireViewerAthlete(
  prisma: PrismaClient,
  supabaseUserId: string,
): Promise<Viewer & { athleteId: string }> {
  const viewer = await resolveViewer(prisma, supabaseUserId);
  if (viewer === null || viewer.athleteId === null) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Athlete profile not found for current user',
    });
  }
  return { ...viewer, athleteId: viewer.athleteId };
}

/** For protected procedures that need an account but not an athlete profile. */
export async function requireViewer(
  prisma: PrismaClient,
  supabaseUserId: string,
): Promise<Viewer> {
  const viewer = await resolveViewer(prisma, supabaseUserId);
  if (viewer === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found for current user' });
  }
  return viewer;
}
