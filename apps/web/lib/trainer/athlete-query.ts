import { slugSchema } from '@packages/validators';

// The invite dialog's one field (design D3): a profile link, an @handle or a
// bare handle becomes an exact slug lookup; anything else a name search.

export type AthleteQuery =
  | { kind: 'empty' }
  | { kind: 'too-short' }
  | { kind: 'too-long' }
  | { kind: 'slug'; slug: string; fallbackName: string | null }
  | { kind: 'name'; query: string };

export const MIN_NAME_QUERY = 2;
export const MAX_NAME_QUERY = 100;

function asSlug(value: string): string | null {
  const parsed = slugSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The slug in a profile URL's `/athlete/<slug>` path, from any host. */
function slugFromUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const match = /^\/athlete\/([^/]+)\/?$/.exec(new URL(value).pathname);
    return match?.[1] ? asSlug(decodeURIComponent(match[1]).toLowerCase()) : null;
  } catch {
    return null;
  }
}

export function parseAthleteQuery(raw: string): AthleteQuery {
  const text = raw.trim();
  if (text === '') return { kind: 'empty' };

  const fromUrl = slugFromUrl(text);
  if (fromUrl !== null) return { kind: 'slug', slug: fromUrl, fallbackName: null };

  const handle = text.startsWith('@') ? text.slice(1) : text;
  if (!/\s/.test(handle)) {
    const slug = asSlug(handle);
    // A handle that finds nothing also falls back to a name search.
    if (slug !== null) return { kind: 'slug', slug, fallbackName: handle };
  }

  if (text.length < MIN_NAME_QUERY) return { kind: 'too-short' };
  if (text.length > MAX_NAME_QUERY) return { kind: 'too-long' };
  return { kind: 'name', query: text };
}
