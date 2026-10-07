/**
 * Athlete visibility (ADR-013, design D5) — the ONE mechanism every club,
 * metric, and achievement read path uses, list and detail alike.
 *
 * Two forms of the same rule, both derived from AUDIENCE_RELATIONS:
 *   - canView(): pure, for a single already-resolved athlete.
 *   - visibleAthleteWhere(): a Prisma filter, so lists filter in the
 *     database instead of post-fetch (no page holes, no over-fetch).
 *
 * A missing AthleteVisibilitySettings row means each category's default
 * (CATEGORY_DEFAULT_AUDIENCE): PRIVATE for club memberships and metrics,
 * PUBLIC for achievements (ADR-014). Owner access is never narrowed. Active-club trainer access to that club's
 * metric entries is handled by metricEntryVisibilityWhere(), never widened
 * to other categories or other clubs.
 */
import type {
  AthleteVisibilitySettingsOwnerOutput,
  UpdateAthleteVisibilityInput,
  VisibilityAudience,
} from '@packages/validators';
import type { Prisma, PrismaClient } from '@prisma/client';

import type { Viewer } from './viewer.js';

export type VisibilityCategory = 'clubMemberships' | 'metrics' | 'achievements';

/** How the viewer relates to the athlete, for audience-controlled data. */
export type AudienceRelation = 'OWNER' | 'CONNECTION' | 'STRANGER';

/** Audience used when the athlete has no settings row. Matches the Prisma column defaults. */
export const CATEGORY_DEFAULT_AUDIENCE: Readonly<Record<VisibilityCategory, VisibilityAudience>> = {
  clubMemberships: 'PRIVATE',
  metrics: 'PRIVATE',
  achievements: 'PUBLIC',
};

/** Which relations each audience admits. The single source of the rule. */
export const AUDIENCE_RELATIONS: Readonly<Record<VisibilityAudience, readonly AudienceRelation[]>> = {
  PRIVATE: ['OWNER'],
  CONNECTIONS: ['OWNER', 'CONNECTION'],
  PUBLIC: ['OWNER', 'CONNECTION', 'STRANGER'],
};

export interface AudienceSettings {
  clubMembershipsAudience: VisibilityAudience;
  metricsAudience: VisibilityAudience;
  achievementsAudience: VisibilityAudience;
}

const AUDIENCE_FIELD = {
  clubMemberships: 'clubMembershipsAudience',
  metrics: 'metricsAudience',
  achievements: 'achievementsAudience',
} as const satisfies Record<VisibilityCategory, keyof AudienceSettings>;

export function audienceFor(
  category: VisibilityCategory,
  settings: AudienceSettings | null,
): VisibilityAudience {
  return settings === null
    ? CATEGORY_DEFAULT_AUDIENCE[category]
    : settings[AUDIENCE_FIELD[category]];
}

export function canView(
  category: VisibilityCategory,
  relation: AudienceRelation,
  settings: AudienceSettings | null,
): boolean {
  return AUDIENCE_RELATIONS[audienceFor(category, settings)].includes(relation);
}

/** Resolves OWNER / CONNECTION (an ACCEPTED connection) / STRANGER. */
export async function resolveAudienceRelation(
  prisma: PrismaClient,
  viewer: Viewer | null,
  athleteId: string,
): Promise<AudienceRelation> {
  const viewerAthleteId = viewer?.athleteId ?? null;
  if (viewerAthleteId === null) return 'STRANGER';
  if (viewerAthleteId === athleteId) return 'OWNER';
  const connection = await prisma.athleteConnection.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: viewerAthleteId, addresseeId: athleteId },
        { requesterId: athleteId, addresseeId: viewerAthleteId },
      ],
    },
    select: { id: true },
  });
  return connection === null ? 'STRANGER' : 'CONNECTION';
}

export async function loadAudienceSettings(
  prisma: PrismaClient,
  athleteId: string,
): Promise<AudienceSettings | null> {
  return prisma.athleteVisibilitySettings.findUnique({
    where: { athleteId },
    select: { clubMembershipsAudience: true, metricsAudience: true, achievementsAudience: true },
  });
}

// ── Database form ───────────────────────────────────────────────────────────

/**
 * Athlete-side filter: does `viewer` hold `relation` to the athlete row?
 * null = the viewer cannot hold it. STRANGER (everyone) is handled by the
 * caller, because Prisma drops `{}` inside OR instead of treating it as TRUE.
 */
function relationWhere(
  relation: Exclude<AudienceRelation, 'STRANGER'>,
  viewer: Viewer | null,
): Prisma.AthleteWhereInput | null {
  const viewerAthleteId = viewer?.athleteId ?? null;
  switch (relation) {
    case 'OWNER':
      return viewerAthleteId === null ? null : { id: viewerAthleteId };
    case 'CONNECTION':
      return viewerAthleteId === null
        ? null
        : {
            OR: [
              { requestedConnections: { some: { addresseeId: viewerAthleteId, status: 'ACCEPTED' } } },
              { receivedConnections: { some: { requesterId: viewerAthleteId, status: 'ACCEPTED' } } },
            ],
          };
  }
}

/** Athlete-side filter: is the athlete's audience for `category` equal to `audience`? */
function audienceWhere(
  category: VisibilityCategory,
  audience: VisibilityAudience,
): Prisma.AthleteWhereInput {
  const matches: Prisma.AthleteWhereInput = {
    visibilitySettings: { is: { [AUDIENCE_FIELD[category]]: audience } },
  };
  // A missing settings row counts as the category's default audience.
  return audience === CATEGORY_DEFAULT_AUDIENCE[category]
    ? { OR: [matches, { visibilitySettings: { is: null } }] }
    : matches;
}

/**
 * Athletes whose `category` data `viewer` may see, as a Prisma filter:
 *   OR over audiences A of (athlete's audience is A AND viewer holds a
 *   relation admitted by A).
 */
export function visibleAthleteWhere(
  category: VisibilityCategory,
  viewer: Viewer | null,
): Prisma.AthleteWhereInput {
  const branches: Prisma.AthleteWhereInput[] = [];
  for (const [audience, relations] of Object.entries(AUDIENCE_RELATIONS) as [
    VisibilityAudience,
    readonly AudienceRelation[],
  ][]) {
    // An audience that admits strangers admits every viewer: no relation filter.
    if (relations.includes('STRANGER')) {
      branches.push(audienceWhere(category, audience));
      continue;
    }
    const relationBranches = relations
      .filter((r): r is Exclude<AudienceRelation, 'STRANGER'> => r !== 'STRANGER')
      .map((r) => relationWhere(r, viewer))
      .filter((w): w is Prisma.AthleteWhereInput => w !== null);
    if (relationBranches.length === 0) continue;
    branches.push({ AND: [audienceWhere(category, audience), { OR: relationBranches }] });
  }
  return { OR: branches };
}

/**
 * Metric entries `viewer` may see: entries of athletes whose metrics are
 * visible to them, plus — regardless of settings — entries whose authorizing
 * membership is ACTIVE with a club the viewer trains (mirrors RLS
 * athlete_metric_entries_select_active_club_trainer).
 */
export function metricEntryVisibilityWhere(
  viewer: Viewer | null,
): Prisma.AthleteMetricEntryWhereInput {
  const byAudience: Prisma.AthleteMetricEntryWhereInput = {
    athlete: visibleAthleteWhere('metrics', viewer),
  };
  if (viewer === null) return byAudience;
  return {
    OR: [
      byAudience,
      {
        clubMembership: {
          status: 'ACTIVE',
          club: { trainers: { some: { userAccountId: viewer.userAccountId } } },
        },
      },
    ],
  };
}

// ── Owner settings ──────────────────────────────────────────────────────────

/** The athlete's own settings; category defaults (updatedAt null) when no row exists. */
export async function getOwnSettings(
  prisma: PrismaClient,
  athleteId: string,
): Promise<AthleteVisibilitySettingsOwnerOutput> {
  const row = await prisma.athleteVisibilitySettings.findUnique({
    where: { athleteId },
    select: {
      clubMembershipsAudience: true,
      metricsAudience: true,
      achievementsAudience: true,
      updatedAt: true,
    },
  });
  return (
    row ?? {
      clubMembershipsAudience: CATEGORY_DEFAULT_AUDIENCE.clubMemberships,
      metricsAudience: CATEGORY_DEFAULT_AUDIENCE.metrics,
      achievementsAudience: CATEGORY_DEFAULT_AUDIENCE.achievements,
      updatedAt: null,
    }
  );
}

export function updateOwnSettings(
  prisma: PrismaClient,
  athleteId: string,
  input: UpdateAthleteVisibilityInput,
): Promise<AthleteVisibilitySettingsOwnerOutput> {
  return prisma.athleteVisibilitySettings.upsert({
    where: { athleteId },
    create: { athleteId, ...input },
    update: input,
    select: {
      clubMembershipsAudience: true,
      metricsAudience: true,
      achievementsAudience: true,
      updatedAt: true,
    },
  });
}
