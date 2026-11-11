// @vitest-environment jsdom
import {
  ApiProvider,
  useDecideCertification,
  useInviteAthleteToClub,
  useQueryClient,
  useReportMetricEntry,
} from '@packages/api-client';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each test runs one trainer mutation through the real ApiProvider against a
// stubbed upstream and records which query keys were invalidated
// (add-web-trainer-portal design D7).

const CLUB = 'clxclub0000000000000000001';
const ATHLETE = 'clxath00000000000000000001';

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
  const input = (queryKey[1] as { input?: Record<string, unknown> } | undefined)?.input;
  if (input === undefined) return path;
  const args = Object.entries(input)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(',');
  return `${path}(${args})`;
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

describe('trainer mutations invalidate the design D7 keys', () => {
  it('club.inviteAthlete', async () => {
    expect(await invalidatedBy(useInviteAthleteToClub, { clubId: CLUB, athleteId: ATHLETE })).toEqual(
      ['club.findAthleteToInvite', `club.listRoster(clubId=${CLUB})`].sort(),
    );
  });

  it('metric.reportEntry', async () => {
    expect(
      await invalidatedBy(useReportMetricEntry, {
        clubId: CLUB,
        athleteId: ATHLETE,
        metricDefinitionId: 'clxdef00000000000000000001',
        value: 52.3,
        measuredAt: new Date('2026-11-04T10:00:00.000Z'),
      }),
    ).toEqual(
      [`metric.getSummaries(athleteId=${ATHLETE})`, `metric.listEntries(athleteId=${ATHLETE})`].sort(),
    );
  });

  it('achievement.decideCertification', async () => {
    const requestId = 'clxreq00000000000000000001';
    const expected = [`achievement.listPendingCertifications(clubId=${CLUB})`];
    expect(
      await invalidatedBy(useDecideCertification, { clubId: CLUB, requestId, decision: 'APPROVE' }),
    ).toEqual(expected);
    expect(
      await invalidatedBy(useDecideCertification, {
        clubId: CLUB,
        requestId,
        decision: 'REJECT',
        rejectionReason: 'La fecha no coincide con el registro del club',
      }),
    ).toEqual(expected);
  });
});
