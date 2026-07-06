import type { PrismaClient } from '@prisma/client';
import { describe, it, expect, vi } from 'vitest';

import { createCachedRoleResolver } from '../lib/userRole.js';

function makePrisma(findUnique: ReturnType<typeof vi.fn>): PrismaClient {
  return { userAccount: { findUnique } } as unknown as PrismaClient;
}

describe('createCachedRoleResolver', () => {
  it('returns the role from UserAccount by supabaseUserId', async () => {
    const findUnique = vi.fn().mockResolvedValue({ role: 'SYSTEM' });
    const resolve = createCachedRoleResolver(makePrisma(findUnique));

    await expect(resolve('supabase-user-1')).resolves.toBe('SYSTEM');
    expect(findUnique).toHaveBeenCalledWith({
      where: { supabaseUserId: 'supabase-user-1' },
      select: { role: true },
    });
  });

  it('caches the role — repeated calls within the TTL hit the DB once', async () => {
    const findUnique = vi.fn().mockResolvedValue({ role: 'ATHLETE' });
    const resolve = createCachedRoleResolver(makePrisma(findUnique));

    await resolve('supabase-user-1');
    await resolve('supabase-user-1');
    await resolve('supabase-user-1');

    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the TTL expires', async () => {
    const findUnique = vi.fn().mockResolvedValue({ role: 'ATHLETE' });
    const resolve = createCachedRoleResolver(makePrisma(findUnique), { ttlMs: 0 });

    await resolve('supabase-user-1');
    await resolve('supabase-user-1');

    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('returns null (and caches it) when no UserAccount exists', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const resolve = createCachedRoleResolver(makePrisma(findUnique));

    await expect(resolve('unknown-user')).resolves.toBeNull();
    await resolve('unknown-user');
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('fails soft: returns null when the DB query throws', async () => {
    const findUnique = vi.fn().mockRejectedValue(new Error('db down'));
    const resolve = createCachedRoleResolver(makePrisma(findUnique));

    await expect(resolve('supabase-user-1')).resolves.toBeNull();
  });

  it('keeps separate cache entries per user', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ role: 'SYSTEM' })
      .mockResolvedValueOnce({ role: 'ATHLETE' });
    const resolve = createCachedRoleResolver(makePrisma(findUnique));

    await expect(resolve('user-a')).resolves.toBe('SYSTEM');
    await expect(resolve('user-b')).resolves.toBe('ATHLETE');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
