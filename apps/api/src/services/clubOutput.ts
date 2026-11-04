/**
 * Club output mapping (ADR-017). Every club returned to a non-admin caller
 * carries the derived L0 `isActive` flag instead of the L1 `deactivatedAt`
 * timestamp. Services select `deactivatedAt` and pass the row through here.
 */

export function clubIsActive(club: { deactivatedAt: Date | null }): boolean {
  return club.deactivatedAt === null;
}

/** Replace `deactivatedAt` with `isActive`, keeping every other selected field. */
export function withIsActive<T extends { deactivatedAt: Date | null }>(
  club: T,
): Omit<T, 'deactivatedAt'> & { isActive: boolean } {
  const { deactivatedAt, ...rest } = club;
  return { ...rest, isActive: deactivatedAt === null };
}
