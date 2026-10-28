// Splits the athlete's own memberships into what the Clubs tab shows
// (ADR-013). Rejected invitations are never shown.

import type { ClubMembershipStatusValue } from './club-membership.js';

export interface MembershipLike {
  status: ClubMembershipStatusValue;
  createdAt: Date;
  respondedAt: Date | null;
  endedAt: Date | null;
}

export interface PartitionedMemberships<T extends MembershipLike> {
  invitations: T[];
  active: T[];
  history: T[];
}

const time = (date: Date | null): number => (date ? date.getTime() : 0);

export function partitionMemberships<T extends MembershipLike>(
  memberships: readonly T[],
): PartitionedMemberships<T> {
  const invitations = memberships
    .filter((m) => m.status === 'PENDING_ATHLETE_CONFIRMATION')
    .sort((a, b) => time(b.createdAt) - time(a.createdAt));
  const active = memberships
    .filter((m) => m.status === 'ACTIVE')
    .sort((a, b) => time(b.respondedAt ?? b.createdAt) - time(a.respondedAt ?? a.createdAt));
  const history = memberships
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => time(b.endedAt) - time(a.endedAt));
  return { invitations, active, history };
}
