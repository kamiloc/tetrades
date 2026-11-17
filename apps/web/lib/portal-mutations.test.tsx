// @vitest-environment jsdom
import { ApiProvider, useQueryClient } from '@packages/api-client';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAcceptTrainerInvitationMutation,
  useCreateClubMutation,
  useDeactivateClubMutation,
  useDeclineTrainerInvitationMutation,
  useInviteTrainerMutation,
  useReactivateClubMutation,
  useRevokeTrainerInvitationMutation,
  useRevokeTrainerMutation,
  useUpdateClubMutation,
} from './portal-mutations';

// Each test runs one mutation through the real ApiProvider (its QueryClient and
// tRPC client) against a stubbed upstream, and records which query keys were
// invalidated.

const CLUB = 'clxclub0000000000000000001';

// Every admin mutation also refreshes the insight pages (add-web-admin-insights D4).
const INSIGHTS = ['admin.getOverview', 'admin.listActions', 'admin.listTrainers'];
const withInsights = (keys: string[]) => [...keys, ...INSIGHTS].sort();

const wrapper = ({ children }: { children: ReactNode }) => (
  <ApiProvider apiUrl="http://localhost/api/trpc" getToken={async () => null}>
    {children}
  </ApiProvider>
);

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json([{ result: { data: { json: { ok: true } } } }])),
  );
});
afterEach(cleanup);

function keyLabel(filters: unknown): string {
  const queryKey = (filters as { queryKey?: unknown[] } | undefined)?.queryKey ?? [];
  const path = Array.isArray(queryKey[0]) ? (queryKey[0] as string[]).join('.') : '';
  const meta = queryKey[1] as { input?: { clubId?: string } } | undefined;
  return meta?.input?.clubId ? `${path}(${meta.input.clubId})` : path;
}

async function invalidatedBy<T>(
  useMutationHook: () => { mutateAsync: (input: T) => Promise<unknown> },
  input: T,
): Promise<string[]> {
  const { result } = renderHook(
    () => ({ mutation: useMutationHook(), queryClient: useQueryClient() }),
    { wrapper },
  );
  const spy = vi.spyOn(result.current.queryClient, 'invalidateQueries');
  await act(async () => {
    await result.current.mutation.mutateAsync(input);
  });
  return [...new Set(spy.mock.calls.map(([filters]) => keyLabel(filters)))].sort();
}

describe('portal mutations invalidate the design D7 keys', () => {
  it('createClub', async () => {
    expect(
      await invalidatedBy(useCreateClubMutation, {
        slug: 'liga-de-atletismo',
        name: 'Liga de Atletismo',
        countryCode: 'CO',
      }),
    ).toEqual(withInsights(['admin.listClubs']));
  });

  it('updateClub', async () => {
    expect(
      await invalidatedBy(useUpdateClubMutation, { clubId: CLUB, name: 'Club Nuevo' }),
    ).toEqual(withInsights([`admin.getClub(${CLUB})`, 'admin.listClubs']));
  });

  it('deactivateClub', async () => {
    expect(await invalidatedBy(useDeactivateClubMutation, { clubId: CLUB })).toEqual(
      withInsights([
        `admin.getClub(${CLUB})`,
        'admin.listClubs',
        `admin.listClubTrainerInvitations(${CLUB})`,
      ]),
    );
  });

  it('reactivateClub', async () => {
    expect(await invalidatedBy(useReactivateClubMutation, { clubId: CLUB })).toEqual(
      withInsights([
        `admin.getClub(${CLUB})`,
        'admin.listClubs',
        `admin.listClubTrainerInvitations(${CLUB})`,
      ]),
    );
  });

  it('inviteTrainer', async () => {
    expect(
      await invalidatedBy(useInviteTrainerMutation, {
        clubId: CLUB,
        email: 'entrenadora@example.co',
      }),
    ).toEqual(withInsights([`admin.listClubTrainerInvitations(${CLUB})`]));
  });

  it('revokeTrainerInvitation (all of the club lists, including this club)', async () => {
    expect(
      await invalidatedBy(useRevokeTrainerInvitationMutation, {
        invitationId: 'clxinv0000000000000000001',
      }),
    ).toEqual(withInsights(['admin.listClubTrainerInvitations']));
  });

  it('revokeTrainer', async () => {
    expect(
      await invalidatedBy(useRevokeTrainerMutation, { clubTrainerId: 'clxtr00000000000000000001' }),
    ).toEqual(withInsights(['admin.getClub', 'admin.listClubTrainers', 'admin.listClubs']));
  });

  it('trainerInvitation.accept and decline', async () => {
    const input = { invitationId: 'clxinv0000000000000000001' };
    expect(await invalidatedBy(useAcceptTrainerInvitationMutation, input)).toEqual([
      'trainerInvitation.listMine',
    ]);
    expect(await invalidatedBy(useDeclineTrainerInvitationMutation, input)).toEqual([
      'trainerInvitation.listMine',
    ]);
  });
});
