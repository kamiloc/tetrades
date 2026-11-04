// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDialogPolyfill } from '../../../../../../test/dialog-polyfill';
import { ok, renderWithApi, sj, stubApi, trpcError, type Reply } from '../../../../../../test/trpc-stub';

import { RosterView } from './roster-view';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

const CLUB = 'clxclub0000000000000000001';
const SPORT = { id: 'clxsport000000000000000001', name: 'Ciclismo BMX' };
const athlete = (id: string, slug: string, displayName: string) => ({ id, slug, displayName, sport: SPORT });

const MARIANA = athlete('clxath00000000000000000001', 'mariana-pajon', 'Mariana Pajón');
const CARLOS = athlete('clxath00000000000000000002', 'carlos-ramirez', 'Carlos Ramírez');
const DIANA = athlete('clxath00000000000000000003', 'diana-garcia', 'Diana García');

const myClubs = ok(
  sj({
    items: [{ club: { id: CLUB, slug: 'liga-bmx-antioquia', name: 'Liga BMX Antioquia', countryCode: 'CO', city: 'Medellín', isActive: true } }],
    nextCursor: null,
  }),
);

const roster = ok(
  sj(
    {
      items: [
        { id: 'clxmem00000000000000000001', status: 'ACTIVE', createdAt: '2026-09-01T12:00:00.000Z', respondedAt: '2026-09-02T12:00:00.000Z', athlete: MARIANA },
        { id: 'clxmem00000000000000000002', status: 'PENDING_ATHLETE_CONFIRMATION', createdAt: '2026-10-20T12:00:00.000Z', respondedAt: null, athlete: CARLOS },
      ],
      nextCursor: null,
    },
    ['items.0.createdAt', 'items.0.respondedAt', 'items.1.createdAt'],
  ),
);
const emptyRoster = ok(sj({ items: [], nextCursor: null }));

type LookupInput = { by: 'name'; query: string } | { by: 'slug'; slug: string };

/** Answers the invite lookup from a fixed set of results. */
function lookup(results: { athlete: typeof MARIANA; relation: 'MEMBER' | 'INVITED_BY_YOU' | null }[]) {
  return (input: unknown): Reply => {
    const q = input as LookupInput;
    const items =
      q.by === 'slug'
        ? results.filter((r) => r.athlete.slug === q.slug)
        : results.filter((r) => r.athlete.displayName.toLowerCase().includes(q.query.toLowerCase()));
    return { result: { data: sj({ items, nextCursor: null }) } };
  };
}

beforeAll(installDialogPolyfill);
afterEach(cleanup);

describe('RosterView', () => {
  it('shows active and pending rows, linking to each athlete', async () => {
    stubApi({ 'club.listMyTrainerClubs': myClubs, 'club.listRoster': roster });
    renderWithApi(<RosterView clubId={CLUB} />);

    const table = await screen.findByRole('table', {}, { timeout: 5000 });
    const [, activeRow, pendingRow] = within(table).getAllByRole('row');
    expect(within(activeRow as HTMLElement).getByText('Mariana Pajón')).toBeTruthy();
    expect(within(activeRow as HTMLElement).getByText('Active')).toBeTruthy();
    expect(within(activeRow as HTMLElement).getByText('Ciclismo BMX')).toBeTruthy();
    expect(within(pendingRow as HTMLElement).getByText('Carlos Ramírez')).toBeTruthy();
    expect(within(pendingRow as HTMLElement).getByText('Waiting for the athlete')).toBeTruthy();
    expect(screen.getByText('@mariana-pajon').closest('a')?.getAttribute('href')).toBe(
      `/trainer/clubs/${CLUB}/athletes/${MARIANA.id}`,
    );
  });

  it('shows the empty state with an invite action', async () => {
    stubApi({ 'club.listMyTrainerClubs': myClubs, 'club.listRoster': emptyRoster });
    renderWithApi(<RosterView clubId={CLUB} />);
    expect(await screen.findByText('No athletes yet', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Invite athlete' }).length).toBe(2);
  });

  it('shows a retryable error when the roster fails to load', async () => {
    stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.listRoster': () => trpcError('INTERNAL_SERVER_ERROR', 500),
    });
    renderWithApi(<RosterView clubId={CLUB} />);
    expect(await screen.findByText("We couldn't load the athletes", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe('InviteAthleteDialog', () => {
  async function openDialog() {
    renderWithApi(<RosterView clubId={CLUB} />);
    await screen.findByRole('table', {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Invite athlete' }));
    const dialog = screen.getByRole('dialog');
    return { dialog, field: within(dialog).getByLabelText('Profile link, handle or name') };
  }

  it('invites a picked result and explains the athlete must confirm', async () => {
    const calls = stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.listRoster': roster,
      'club.findAthleteToInvite': lookup([{ athlete: DIANA, relation: null }]),
      'club.inviteAthlete': ok(sj({ id: 'clxmem00000000000000000003', status: 'PENDING_ATHLETE_CONFIRMATION' })),
    });
    const { dialog, field } = await openDialog();

    fireEvent.change(field, { target: { value: 'https://athletepassport.co/athlete/diana-garcia' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Invite Diana García' }, { timeout: 3000 }));

    expect(
      await screen.findByText('Invitation sent. Diana García must confirm before joining.', {}, { timeout: 3000 }),
    ).toBeTruthy();
    expect(calls.find((c) => c.procedure === 'club.findAthleteToInvite')?.input).toEqual({
      clubId: CLUB,
      by: 'slug',
      slug: 'diana-garcia',
    });
    expect(calls.find((c) => c.procedure === 'club.inviteAthlete')?.input).toEqual({
      clubId: CLUB,
      athleteId: DIANA.id,
    });
    // The roster is refreshed (design D7).
    await waitFor(() => expect(calls.filter((c) => c.procedure === 'club.listRoster').length).toBe(2));
  });

  it("can't invite a member or this trainer's own invitee", async () => {
    const calls = stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.listRoster': roster,
      'club.findAthleteToInvite': lookup([
        { athlete: MARIANA, relation: 'MEMBER' },
        { athlete: CARLOS, relation: 'INVITED_BY_YOU' },
      ]),
    });
    const { dialog, field } = await openDialog();

    fireEvent.change(field, { target: { value: 'ar' } });
    const list = await within(dialog).findByRole('list', { name: 'Athletes found' }, { timeout: 3000 });
    expect(within(list).getByText('Member')).toBeTruthy();
    expect(within(list).getByText('Waiting for the athlete')).toBeTruthy();
    expect(within(list).queryByRole('button')).toBeNull();
    expect(calls.find((c) => c.procedure === 'club.findAthleteToInvite')?.input).toMatchObject({
      by: 'name',
      query: 'ar',
    });
  });

  it('shows the conflict message when the invitation is answered with CONFLICT', async () => {
    stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.listRoster': roster,
      'club.findAthleteToInvite': lookup([{ athlete: DIANA, relation: null }]),
      'club.inviteAthlete': () => trpcError('CONFLICT', 409),
    });
    const { dialog, field } = await openDialog();

    fireEvent.change(field, { target: { value: '@diana-garcia' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Invite Diana García' }, { timeout: 3000 }));
    expect(
      await within(dialog).findByText(
        'This athlete already has a pending or active membership with the club.',
        {},
        { timeout: 3000 },
      ),
    ).toBeTruthy();
    expect(within(dialog).queryByText(/Invitation sent/)).toBeNull();
  });

  it('says nothing was found, after falling back from a handle to a name', async () => {
    const calls = stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.listRoster': roster,
      'club.findAthleteToInvite': lookup([]),
    });
    const { dialog, field } = await openDialog();

    fireEvent.change(field, { target: { value: 'nadie-conocido' } });
    expect(await within(dialog).findByText('No athlete found', {}, { timeout: 3000 })).toBeTruthy();
    const lookups = calls.filter((c) => c.procedure === 'club.findAthleteToInvite').map((c) => c.input);
    expect(lookups).toContainEqual({ clubId: CLUB, by: 'slug', slug: 'nadie-conocido' });
    expect(lookups).toContainEqual(expect.objectContaining({ by: 'name', query: 'nadie-conocido' }));
  });
});
