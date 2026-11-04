// Where /trainer sends a signed-in user (design D1): straight to the only
// club's roster, to the picker for several clubs, or nowhere (no club yet).

export type TrainerHome = { kind: 'no-club' } | { kind: 'redirect'; to: string };

export function clubRosterPath(clubId: string): string {
  return `/trainer/clubs/${clubId}/athletes`;
}

export function trainerHomeFor(clubIds: readonly string[]): TrainerHome {
  const [only] = clubIds;
  if (only === undefined) return { kind: 'no-club' };
  if (clubIds.length === 1) return { kind: 'redirect', to: clubRosterPath(only) };
  return { kind: 'redirect', to: '/trainer/clubs' };
}
