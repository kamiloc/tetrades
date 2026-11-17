/**
 * Admin insights (add-web-admin-insights; admin-platform-insights spec):
 * the platform overview counts, the cross-club trainer directory and the
 * admin action log. Read-only: nothing here writes, so no AdminActionLog row
 * is ever created by a read.
 *
 * Admin authority covers clubs and trainer access only (ADR-017), so no
 * function here selects athlete data, and no output carries a user account
 * id, a Supabase id or a request id.
 *
 * The action log resolves acting-admin emails through the AdminDirectory
 * port (design D2) — an owner-approved exception to "no external calls from
 * procedures". Lookups are cached for 5 minutes, failures are never cached
 * and degrade to `email: null`, and an email is never logged.
 */
import {
  adminActionMetadataSchema,
  adminActionTargetTypeEnum,
  type AdminActionDetailsOutput,
  type AdminActionListOutput,
  type AdminOverviewOutput,
  type AdminTrainerAccess,
  type AdminTrainerDirectoryListOutput,
  type ListAdminActionsInput,
  type ListAdminTrainersInput,
} from '@packages/validators';
import type { Prisma, PrismaClient } from '@prisma/client';

import { cursorArgs, toPage } from '../lib/pagination.js';
import type { AdminDirectory } from '../lib/supabaseAdmin.js';

import { clubsWithoutActiveTrainerWhere } from './adminClubs.js';
import { resolveInvitedEmails } from './trainerInvitations.js';

const HOUR_MS = 60 * 60 * 1000;
const EXPIRING_WINDOW_MS = 48 * HOUR_MS;

interface RequestLog {
  requestId: string;
  log: { warn: (obj: Record<string, unknown>, msg?: string) => void };
}

// ──────────────────────────────────────────────
// Acting-admin email lookup (design D2)
// ──────────────────────────────────────────────

export const EMAIL_CACHE_TTL_MS = 5 * 60 * 1000;
export const EMAIL_CACHE_MAX_ENTRIES = 100;

/** Resolves an acting admin's email; null when unavailable. Never throws. */
export type AdminEmailLookup = (
  supabaseUserId: string,
  request: RequestLog,
) => Promise<string | null>;

/**
 * Wraps the directory in an in-process cache keyed by Supabase user id. Only
 * successful lookups (including "no such user") are cached; an error returns
 * null and retries on the next call. The oldest entry is evicted at the cap.
 */
export function createCachedEmailLookup(
  directory: AdminDirectory,
  options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {},
): AdminEmailLookup {
  const ttlMs = options.ttlMs ?? EMAIL_CACHE_TTL_MS;
  const maxEntries = options.maxEntries ?? EMAIL_CACHE_MAX_ENTRIES;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { email: string | null; expiresAt: number }>();

  return async (supabaseUserId, request) => {
    const hit = cache.get(supabaseUserId);
    if (hit !== undefined && hit.expiresAt > now()) return hit.email;
    cache.delete(supabaseUserId);
    try {
      const email = await directory.getUserEmail(supabaseUserId);
      if (cache.size >= maxEntries) {
        const oldest = cache.keys().next();
        if (oldest.done !== true) cache.delete(oldest.value);
      }
      cache.set(supabaseUserId, { email, expiresAt: now() + ttlMs });
      return email;
    } catch (error) {
      // requestId and the error name only: never the email, id or message.
      request.log.warn(
        {
          event: 'admin_email_lookup_failed',
          requestId: request.requestId,
          error: error instanceof Error ? { name: error.name } : 'unknown',
        },
        'acting admin email lookup failed',
      );
      return null;
    }
  };
}

// ──────────────────────────────────────────────
// Overview (design D1)
// ──────────────────────────────────────────────

/** ADR-017 ACTIVE access: not revoked, at an active club. */
const activeTrainerWhere = {
  revokedAt: null,
  club: { deactivatedAt: null },
} satisfies Prisma.ClubTrainerWhereInput;

/**
 * Six counts in one REPEATABLE READ transaction: every statement reads the
 * snapshot taken at the first one, so the counts agree with each other.
 */
export async function getOverview(prisma: PrismaClient): Promise<AdminOverviewOutput> {
  const generatedAt = new Date();
  const expiringBefore = new Date(generatedAt.getTime() + EXPIRING_WINDOW_MS);
  const [
    activeClubs,
    deactivatedClubs,
    activeClubsWithoutTrainer,
    activeTrainers,
    pendingTrainerInvitations,
    expiringTrainerInvitations,
  ] = await prisma.$transaction(
    [
      prisma.club.count({ where: { deactivatedAt: null } }),
      prisma.club.count({ where: { deactivatedAt: { not: null } } }),
      prisma.club.count({ where: clubsWithoutActiveTrainerWhere }),
      prisma.clubTrainer.count({ where: activeTrainerWhere }),
      // The same "pending" rule the per-club invitation list derives.
      prisma.clubTrainerInvitation.count({
        where: { status: 'PENDING', expiresAt: { gt: generatedAt } },
      }),
      prisma.clubTrainerInvitation.count({
        where: { status: 'PENDING', expiresAt: { gt: generatedAt, lte: expiringBefore } },
      }),
    ],
    { isolationLevel: 'RepeatableRead' },
  );
  return {
    activeClubs,
    deactivatedClubs,
    activeClubsWithoutTrainer,
    activeTrainers,
    pendingTrainerInvitations,
    expiringTrainerInvitations,
    generatedAt,
  };
}

// ──────────────────────────────────────────────
// Trainer directory (design D1)
// ──────────────────────────────────────────────

/** ADR-017 access: revoked wins; otherwise the club decides. */
export function trainerAccess(
  revokedAt: Date | null,
  clubDeactivatedAt: Date | null,
): AdminTrainerAccess {
  if (revokedAt !== null) return 'REVOKED';
  return clubDeactivatedAt === null ? 'ACTIVE' : 'CLUB_DEACTIVATED';
}

const accessWhere: Record<AdminTrainerAccess, Prisma.ClubTrainerWhereInput> = {
  ACTIVE: activeTrainerWhere,
  CLUB_DEACTIVATED: { revokedAt: null, club: { deactivatedAt: { not: null } } },
  REVOKED: { revokedAt: { not: null } },
};

export async function listTrainers(
  prisma: PrismaClient,
  input: ListAdminTrainersInput,
): Promise<AdminTrainerDirectoryListOutput> {
  const where: Prisma.ClubTrainerWhereInput = {
    AND: [
      input.access === 'ALL' ? {} : accessWhere[input.access],
      input.clubQuery === undefined
        ? {}
        : { club: { name: { contains: input.clubQuery, mode: 'insensitive' } } },
    ],
  };
  const rows = await prisma.clubTrainer.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      clubId: true,
      userAccountId: true,
      createdAt: true,
      revokedAt: true,
      club: { select: { id: true, slug: true, name: true, deactivatedAt: true } },
    },
  });
  const invitedEmail = await resolveInvitedEmails(prisma, rows);
  return toPage(
    rows.map((row) => ({
      id: row.id,
      access: trainerAccess(row.revokedAt, row.club.deactivatedAt),
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      invitedEmail: invitedEmail(row),
      club: {
        id: row.club.id,
        slug: row.club.slug,
        name: row.club.name,
        isActive: row.club.deactivatedAt === null,
      },
    })),
    input.take,
    (r) => r.id,
  );
}

// ──────────────────────────────────────────────
// Admin action log (design D1, D2)
// ──────────────────────────────────────────────

export interface ActionLogCaller extends RequestLog {
  admin: { userAccountId: string };
}

/** Changed field names and cancelled counts only; anything else is dropped. */
function detailsOf(metadata: Prisma.JsonValue): {
  clubId: string | null;
  details: AdminActionDetailsOutput;
} {
  const parsed = adminActionMetadataSchema.safeParse(metadata);
  if (!parsed.success) return { clubId: null, details: {} };
  const { clubId, closedExpiredInvitationId: _dropped, ...details } = parsed.data;
  return { clubId: clubId ?? null, details };
}

export async function listActions(
  prisma: PrismaClient,
  caller: ActionLogCaller,
  lookupEmail: AdminEmailLookup,
  input: ListAdminActionsInput,
): Promise<AdminActionListOutput> {
  const where: Prisma.AdminActionLogWhereInput = {
    ...(input.action === undefined ? {} : { action: input.action }),
    ...(input.clubId === undefined
      ? {}
      : {
          OR: [
            { targetType: 'club', targetId: input.clubId },
            { metadata: { path: ['clubId'], equals: input.clubId } },
          ],
        }),
  };
  const rows = await prisma.adminActionLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
      actorUserAccountId: true,
      actor: { select: { supabaseUserId: true } },
    },
  });
  const page = toPage(rows, input.take, (r) => r.id);

  const parsed = page.items.map((row) => {
    const { clubId: metadataClubId, details } = detailsOf(row.metadata);
    const clubId = row.targetType === 'club' ? row.targetId : metadataClubId;
    return { row, clubId, details };
  });

  const clubIds = [...new Set(parsed.flatMap((p) => (p.clubId === null ? [] : [p.clubId])))];
  const clubs =
    clubIds.length === 0
      ? []
      : await prisma.club.findMany({
          where: { id: { in: clubIds } },
          select: { id: true, name: true },
        });
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  // Distinct non-self actors only, in parallel; the caller's rows say "You".
  const otherActors = [
    ...new Set(
      page.items
        .filter((r) => r.actorUserAccountId !== caller.admin.userAccountId)
        .map((r) => r.actor.supabaseUserId),
    ),
  ];
  const emails = new Map(
    await Promise.all(otherActors.map(async (id) => [id, await lookupEmail(id, caller)] as const)),
  );

  return {
    nextCursor: page.nextCursor,
    items: parsed.map(({ row, clubId, details }) => {
      const isYou = row.actorUserAccountId === caller.admin.userAccountId;
      return {
        id: row.id,
        action: row.action,
        // Written only by recordAdminAction with one of the three types.
        targetType: adminActionTargetTypeEnum.parse(row.targetType),
        targetId: row.targetId,
        createdAt: row.createdAt,
        club: clubId === null ? null : (clubById.get(clubId) ?? null),
        details,
        actor: { isYou, email: isYou ? null : (emails.get(row.actor.supabaseUserId) ?? null) },
      };
    }),
  };
}
