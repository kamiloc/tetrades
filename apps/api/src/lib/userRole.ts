import type { PrismaClient } from '@prisma/client';

export type RoleResolver = (supabaseUserId: string) => Promise<string | null>;

const DEFAULT_TTL_MS = 60_000;

interface CacheEntry {
  role: string | null;
  expiresAt: number;
}

/**
 * Resolve `UserAccount.role` by supabaseUserId with a per-process TTL cache,
 * so the rate limiter can apply the admin tier (role SYSTEM) without a DB
 * query on every request — at most one indexed lookup per user per TTL.
 *
 * Fails soft: any DB error yields null (rate limiting falls back to the
 * authenticated tier). Role is a throttling hint, never an authorization
 * decision, so a stale or missing value is always safe.
 */
export function createCachedRoleResolver(
  prisma: PrismaClient,
  options?: { ttlMs?: number },
): RoleResolver {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const cache = new Map<string, CacheEntry>();

  return async (supabaseUserId) => {
    const now = Date.now();
    const cached = cache.get(supabaseUserId);
    if (cached && cached.expiresAt > now) {
      return cached.role;
    }

    try {
      const account = await prisma.userAccount.findUnique({
        where: { supabaseUserId },
        select: { role: true },
      });
      const role = account?.role ?? null;
      cache.set(supabaseUserId, { role, expiresAt: now + ttlMs });
      return role;
    } catch {
      return cached?.role ?? null;
    }
  };
}
