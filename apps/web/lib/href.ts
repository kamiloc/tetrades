/** `path` with the given query params; undefined, null and '' are left out. */
export function withParams(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return query === '' ? path : `${path}?${query}`;
}
