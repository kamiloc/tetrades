// @vitest-environment jsdom
import { ApiProvider } from '@packages/api-client';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDialogPolyfill } from '../../../../../test/dialog-polyfill';

import { ClubDetailView } from './club-detail-view';
import { TrainersView } from './trainers/trainers-view';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const CLUB = 'clxclub0000000000000000001';
const CREATED = '2026-10-01T12:00:00.000Z';

const activeClub = {
  json: {
    id: CLUB,
    slug: 'liga-bogota',
    name: 'Liga de Atletismo de Bogotá',
    countryCode: 'CO',
    city: 'Bogotá',
    deactivatedAt: null,
    createdAt: CREATED,
    isActive: true,
    activeTrainerCount: 2,
  },
  meta: { values: { createdAt: ['Date'] } },
};

const emptyPage = { json: { items: [], nextCursor: null } };

function trpcError(code: string, httpStatus: number) {
  return { error: { json: { message: 'error', code: -32600, data: { code, httpStatus } } } };
}

type Reply = { result: { data: unknown } } | ReturnType<typeof trpcError>;

/** Answers each tRPC procedure in a batch from `replies`; records the calls. */
function stubApi(replies: Record<string, () => Reply>): string[] {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const procedures = decodeURIComponent(url.pathname.split('/api/trpc/')[1] ?? '').split(',');
      calls.push(...procedures);
      const body = procedures.map((name) => {
        const reply = replies[name];
        return reply ? reply() : trpcError('NOT_FOUND', 404);
      });
      const failed = body.some((entry) => 'error' in entry);
      return Response.json(body, { status: failed ? 400 : 200 });
    }),
  );
  return calls;
}

const ok = (data: unknown) => () => ({ result: { data } });

function renderWithApi(node: ReactNode) {
  return render(
    <ApiProvider apiUrl="http://localhost/api/trpc" getToken={async () => null}>
      {node}
    </ApiProvider>,
  );
}

beforeAll(installDialogPolyfill);
afterEach(cleanup);

describe('TrainersView', () => {
  it('shows a retryable error, not an active club, when the club fails to load', async () => {
    stubApi({
      'admin.getClub': () => trpcError('INTERNAL_SERVER_ERROR', 500),
      'admin.listClubTrainers': ok(emptyPage),
      'admin.listClubTrainerInvitations': ok(emptyPage),
    });
    renderWithApi(<TrainersView clubId={CLUB} appOrigin="https://portal.example.co" />);

    expect(
      await screen.findByText("We couldn't load this club", {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Invite trainer/ })).toBeNull();
  });

  it('shows Club not found for an unknown club', async () => {
    stubApi({ 'admin.getClub': () => trpcError('NOT_FOUND', 404) });
    renderWithApi(<TrainersView clubId={CLUB} appOrigin="https://portal.example.co" />);
    expect(await screen.findByText('Club not found', {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe('ClubDetailView', () => {
  it('reloads the club when another admin already changed its status', async () => {
    const calls = stubApi({
      'admin.getClub': ok(activeClub),
      'admin.deactivateClub': () => trpcError('BAD_REQUEST', 400),
    });
    renderWithApi(<ClubDetailView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate club' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate club' }));

    await waitFor(() => {
      expect(calls.filter((name) => name === 'admin.getClub').length).toBe(2);
    });
    expect(screen.queryByText("We couldn't deactivate the club. Try again.")).toBeNull();
  });
});
