/**
 * Trainer workspace reads (add-web-trainer-portal, design D2).
 *
 * Every read stays inside the trainer access boundary: the roster and one
 * roster athlete share one filter (list and detail alike, AGENTS.md), and no
 * select reaches an athlete's memberships with other clubs. The invite lookup
 * is the spec's one exception: L0 identity of athletes outside the club.
 */
import type {
  AthleteToInviteOutput,
  AthleteToInviteRelation,
  ClubRosterEntryOutput,
  FindAthleteToInviteInput,
  MyTrainerClubOutput,
  PaginationInput,
} from '@packages/validators';
import type { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { cursorArgs, toPage, type Page } from '../lib/pagination.js';

import { withIsActive } from './clubOutput.js';
import type { ClubTrainerRef } from './membership.js';
import { resolveViewer } from './viewer.js';

/** L0 athlete identity as a trainer sees it. Never add memberships here. */
const athleteIdentitySelect = {
  id: true,
  slug: true,
  displayName: true,
  sport: { select: { id: true, name: true } },
} satisfies Prisma.AthleteSelect;

/**
 * Roster filter (trainer-access-boundary): ACTIVE memberships of the club,
 * plus pending invitations this trainer sent. Ended, rejected and other
 * trainers' pending invitations never match.
 */
export function rosterWhere(trainer: ClubTrainerRef): Prisma.ClubMembershipWhereInput {
  return {
    clubId: trainer.clubId,
    OR: [
      { status: 'ACTIVE' },
      { status: 'PENDING_ATHLETE_CONFIRMATION', invitedByClubTrainerId: trainer.id },
    ],
  };
}

export const rosterSelect = {
  id: true,
  status: true,
  createdAt: true,
  respondedAt: true,
  athlete: { select: athleteIdentitySelect },
} satisfies Prisma.ClubMembershipSelect;

/**
 * The caller's own non-revoked trainer assignments at active clubs, by club
 * name then id. The cursor is the club id. Users with no assignment (athletes,
 * admins, unknown accounts) get an empty page.
 */
export async function listMyTrainerClubs(
  prisma: PrismaClient,
  supabaseUserId: string,
  input: PaginationInput,
): Promise<Page<MyTrainerClubOutput>> {
  const viewer = await resolveViewer(prisma, supabaseUserId);
  if (viewer === null) return { items: [], nextCursor: null };
  const clubs = await prisma.club.findMany({
    where: {
      deactivatedAt: null,
      trainers: { some: { userAccountId: viewer.userAccountId, revokedAt: null } },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    ...cursorArgs(input),
    select: {
      id: true,
      slug: true,
      name: true,
      countryCode: true,
      city: true,
      deactivatedAt: true,
    },
  });
  const page = toPage(clubs, input.take, (c) => c.id);
  return { items: page.items.map((c) => ({ club: withIsActive(c) })), nextCursor: page.nextCursor };
}

/** One roster athlete, under the same filter as the roster. */
export async function getRosterAthlete(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: { athleteId: string },
): Promise<ClubRosterEntryOutput> {
  // At most one row: rosterWhere matches open statuses only, and the partial
  // unique index allows one open membership per (club, athlete).
  const row = await prisma.clubMembership.findFirst({
    where: { ...rosterWhere(trainer), athleteId: input.athleteId },
    select: rosterSelect,
  });
  if (row === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Athlete not found in this club' });
  }
  return row;
}

/**
 * Invite lookup (trainer-access-boundary exception). By name: searchable
 * ACTIVE profiles, case-insensitive, by name then id. By slug: one exact
 * match among ACTIVE profiles, searchable or not.
 */
export async function findAthleteToInvite(
  prisma: PrismaClient,
  trainer: ClubTrainerRef,
  input: FindAthleteToInviteInput,
): Promise<Page<AthleteToInviteOutput>> {
  // Only this club's open memberships; nothing about other clubs.
  const select = {
    ...athleteIdentitySelect,
    clubMemberships: {
      where: {
        clubId: trainer.clubId,
        status: { in: ['ACTIVE', 'PENDING_ATHLETE_CONFIRMATION'] },
      },
      select: { status: true, invitedByClubTrainerId: true },
    },
  } satisfies Prisma.AthleteSelect;

  type Row = Prisma.AthleteGetPayload<{ select: typeof select }>;
  const toResult = ({ clubMemberships, ...athlete }: Row): AthleteToInviteOutput => ({
    athlete,
    relation: relationOf(clubMemberships, trainer),
  });

  if (input.by === 'slug') {
    const row = await prisma.athlete.findFirst({
      where: { slug: input.slug, profileStatus: 'ACTIVE' },
      select,
    });
    return { items: row === null ? [] : [toResult(row)], nextCursor: null };
  }

  const rows = await prisma.athlete.findMany({
    where: {
      profileStatus: 'ACTIVE',
      publicProfile: { isSearchable: true },
      displayName: { contains: input.query, mode: 'insensitive' },
    },
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    ...cursorArgs(input),
    select,
  });
  const page = toPage(rows, input.take, (r) => r.id);
  return { items: page.items.map(toResult), nextCursor: page.nextCursor };
}

/** Another trainer's pending invitation is not revealed (spec): it maps to null. */
function relationOf(
  memberships: { status: string; invitedByClubTrainerId: string }[],
  trainer: ClubTrainerRef,
): AthleteToInviteRelation | null {
  if (memberships.some((m) => m.status === 'ACTIVE')) return 'MEMBER';
  if (
    memberships.some(
      (m) => m.status === 'PENDING_ATHLETE_CONFIRMATION' && m.invitedByClubTrainerId === trainer.id,
    )
  ) {
    return 'INVITED_BY_YOU';
  }
  return null;
}
