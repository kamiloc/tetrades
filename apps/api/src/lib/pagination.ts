/**
 * Cursor pagination helpers (AGENTS.md Performance rules: cursor + take,
 * default 20, max 50 — limits are enforced by paginationInput in Zod).
 *
 * Callers fetch `take + 1` rows ordered by a stable key ending in `id`; the
 * extra row only signals that another page exists.
 */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function cursorArgs(input: { cursor?: string | undefined; take: number }): {
  take: number;
  skip?: number;
  cursor?: { id: string };
} {
  return input.cursor === undefined
    ? { take: input.take + 1 }
    : { take: input.take + 1, skip: 1, cursor: { id: input.cursor } };
}

export function toPage<T>(rows: T[], take: number, idOf: (row: T) => string): Page<T> {
  const items = rows.slice(0, take);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > take && last !== undefined ? idOf(last) : null,
  };
}
