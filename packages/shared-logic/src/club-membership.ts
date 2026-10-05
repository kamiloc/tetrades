// Club membership lifecycle (ADR-013 §5). Pure constants and functions only.
// The literal values mirror `clubMembershipStatusEnum` in @packages/validators;
// apps/api asserts the two stay identical at compile time.

export const CLUB_MEMBERSHIP_STATUSES = [
  'PENDING_ATHLETE_CONFIRMATION',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
] as const;

export type ClubMembershipStatusValue = (typeof CLUB_MEMBERSHIP_STATUSES)[number];

// The only allowed edges. COMPLETED and REJECTED are terminal.
export const CLUB_MEMBERSHIP_TRANSITIONS: Readonly<
  Record<ClubMembershipStatusValue, readonly ClubMembershipStatusValue[]>
> = {
  PENDING_ATHLETE_CONFIRMATION: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
};

// Statuses that block a new invitation for the same (club, athlete).
export const OPEN_CLUB_MEMBERSHIP_STATUSES: readonly ClubMembershipStatusValue[] = [
  'PENDING_ATHLETE_CONFIRMATION',
  'ACTIVE',
];

export function canTransitionClubMembership(
  from: ClubMembershipStatusValue,
  to: ClubMembershipStatusValue,
): boolean {
  return CLUB_MEMBERSHIP_TRANSITIONS[from].includes(to);
}

// Only ACTIVE grants a club's trainers read/write access to the athlete.
export function clubMembershipGrantsTrainerAccess(status: ClubMembershipStatusValue): boolean {
  return status === 'ACTIVE';
}
