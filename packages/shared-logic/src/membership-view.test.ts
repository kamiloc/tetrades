import { describe, expect, it } from 'vitest';

import { partitionMemberships, type MembershipLike } from './membership-view.js';

const d = (iso: string): Date => new Date(iso);

const make = (
  id: string,
  status: MembershipLike['status'],
  createdAt: string,
  respondedAt: string | null = null,
  endedAt: string | null = null,
): MembershipLike & { id: string } => ({
  id,
  status,
  createdAt: d(createdAt),
  respondedAt: respondedAt ? d(respondedAt) : null,
  endedAt: endedAt ? d(endedAt) : null,
});

describe('partitionMemberships', () => {
  it('returns empty groups for no memberships', () => {
    expect(partitionMemberships([])).toEqual({ invitations: [], active: [], history: [] });
  });

  it('splits by status and drops rejected invitations', () => {
    const result = partitionMemberships([
      make('pending', 'PENDING_ATHLETE_CONFIRMATION', '2026-10-01'),
      make('active', 'ACTIVE', '2025-01-01', '2025-01-02'),
      make('done', 'COMPLETED', '2023-01-01', '2023-01-02', '2024-06-01'),
      make('rejected', 'REJECTED', '2026-09-01', '2026-09-02'),
    ]);
    expect(result.invitations.map((m) => m.id)).toEqual(['pending']);
    expect(result.active.map((m) => m.id)).toEqual(['active']);
    expect(result.history.map((m) => m.id)).toEqual(['done']);
  });

  it('orders history newest first by end date', () => {
    const result = partitionMemberships([
      make('old', 'COMPLETED', '2019-01-01', '2019-01-02', '2020-01-01'),
      make('new', 'COMPLETED', '2021-01-01', '2021-01-02', '2023-01-01'),
    ]);
    expect(result.history.map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('orders invitations newest first', () => {
    const result = partitionMemberships([
      make('a', 'PENDING_ATHLETE_CONFIRMATION', '2026-01-01'),
      make('b', 'PENDING_ATHLETE_CONFIRMATION', '2026-05-01'),
    ]);
    expect(result.invitations.map((m) => m.id)).toEqual(['b', 'a']);
  });
});
