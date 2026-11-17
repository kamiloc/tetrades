// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarNav } from '../../../components/sidebar-nav';
import { ADMIN_SECTIONS } from '../../../lib/admin-nav';
import { installDialogPolyfill } from '../../../test/dialog-polyfill';
import { ok, renderWithApi, sj, stubApi, trpcError, type StubCall } from '../../../test/trpc-stub';

import { ActivityView } from './activity/activity-view';
import { ClubsView } from './clubs/clubs-view';
import { OverviewView } from './overview-view';
import { TrainersDirectoryView } from './trainers/trainers-view';

// One router and one params object per test, so effects see stable values.
const nav = vi.hoisted(() => ({
  pathname: '/admin',
  params: new URLSearchParams(),
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  useSearchParams: () => nav.params,
  usePathname: () => nav.pathname,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const CLUB_A = 'clxclub0000000000000000001';
const CLUB_B = 'clxclub0000000000000000002';
const T = '2026-11-09T15:30:00.000Z';
const emptyPage = sj({ items: [], nextCursor: null });

beforeAll(installDialogPolyfill);
beforeEach(() => {
  nav.pathname = '/admin';
  nav.params = new URLSearchParams();
  nav.router.replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const inputsOf = (calls: StubCall[], procedure: string) =>
  calls.filter((c) => c.procedure === procedure).map((c) => c.input as Record<string, unknown>);

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 450)));

// ── 5.1 Overview ────────────────────────────────────────────────────────────

describe('OverviewView', () => {
  const overview = sj(
    {
      activeClubs: 17,
      deactivatedClubs: 4,
      activeClubsWithoutTrainer: 3,
      activeTrainers: 26,
      pendingTrainerInvitations: 9,
      expiringTrainerInvitations: 2,
      generatedAt: T,
    },
    ['generatedAt'],
  );

  it('shows the six counts, the update time and the right links', async () => {
    stubApi({ 'admin.getOverview': ok(overview), 'admin.listActions': ok(emptyPage) });
    renderWithApi(<OverviewView />);

    expect(await screen.findByText('17', {}, { timeout: 5000 })).toBeTruthy();
    for (const value of ['4', '3', '26', '9', '2']) expect(screen.getByText(value)).toBeTruthy();
    expect(screen.getByText(/^Updated /)).toBeTruthy();

    const href = (name: RegExp) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href(/^4\s*Deactivated clubs/)).toBe('/admin/clubs?status=DEACTIVATED');
    expect(href(/no active trainer/)).toBe('/admin/clubs?status=ACTIVE&trainers=none');
    expect(href(/Active trainers/)).toBe('/admin/trainers?access=ACTIVE');
    expect(href(/^17\s*Active clubs/)).toBe('/admin/clubs?status=ACTIVE');

    // The invitation counts are plain text, never links.
    expect(screen.queryByRole('link', { name: /Pending trainer invitations/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /expiring/i })).toBeNull();
    expect(screen.getByText('Pending trainer invitations')).toBeTruthy();

    // Nothing yet: the recent activity area offers to create a club.
    expect(await screen.findByRole('link', { name: 'Create a club' })).toBeTruthy();
  });

  it('shows a retryable error when the overview fails', async () => {
    stubApi({
      'admin.getOverview': () => trpcError('INTERNAL_SERVER_ERROR', 500),
      'admin.listActions': ok(emptyPage),
    });
    renderWithApi(<OverviewView />);
    expect(
      await screen.findByText("We couldn't load the overview", {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0);
  });
});

describe('SidebarNav', () => {
  it('marks Overview current only on /admin itself', () => {
    nav.pathname = '/admin/clubs';
    render(<SidebarNav sections={ADMIN_SECTIONS} />);
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Clubs' }).getAttribute('aria-current')).toBe('page');
    cleanup();

    nav.pathname = '/admin';
    render(<SidebarNav sections={ADMIN_SECTIONS} />);
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe(
      'page',
    );
    cleanup();

    nav.pathname = '/admin/trainers';
    render(<SidebarNav sections={ADMIN_SECTIONS} />);
    expect(screen.getByRole('link', { name: 'Trainers' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});

// ── 5.2 Trainer directory ───────────────────────────────────────────────────

describe('TrainersDirectoryView', () => {
  const page = sj(
    {
      items: [
        {
          id: 'clxtr00000000000000000001',
          access: 'CLUB_DEACTIVATED',
          createdAt: T,
          revokedAt: null,
          invitedEmail: 'laura.mejia@ligas.co',
          club: {
            id: CLUB_A,
            slug: 'liga-bogota',
            name: 'Liga de Atletismo de Bogotá',
            isActive: false,
          },
        },
        {
          id: 'clxtr00000000000000000002',
          access: 'ACTIVE',
          createdAt: T,
          revokedAt: null,
          invitedEmail: null,
          club: { id: CLUB_B, slug: 'club-cali', name: 'Club Natación Cali', isActive: true },
        },
      ],
      nextCursor: null,
    },
    ['items.0.createdAt', 'items.1.createdAt'],
  );

  it('lists rows from two clubs with access, invited email and club links', async () => {
    nav.params = new URLSearchParams('access=ALL');
    const calls = stubApi({ 'admin.listTrainers': ok(page) });
    renderWithApi(<TrainersDirectoryView />);

    expect(
      await screen.findByText('Liga de Atletismo de Bogotá', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByText('Club Natación Cali')).toBeTruthy();
    expect(inputsOf(calls, 'admin.listTrainers')[0]).toMatchObject({ access: 'ALL' });

    const [, deactivatedRow, activeRow] = screen.getAllByRole('row');
    if (deactivatedRow === undefined || activeRow === undefined) throw new Error('rows missing');
    const deactivated = within(deactivatedRow);
    expect(deactivated.getByText('Club deactivated')).toBeTruthy();
    expect(deactivated.getByText('Deactivated')).toBeTruthy();
    expect(deactivated.queryByText('Active')).toBeNull();
    expect(within(activeRow).getByText('Provisioned before invitations')).toBeTruthy();

    expect(deactivated.getByRole('link', { name: /Liga de Atletismo/ }).getAttribute('href')).toBe(
      `/admin/clubs/${CLUB_A}/trainers`,
    );
  });

  it('defaults to Active, keeps the access filter in the URL, and searches from 2 characters', async () => {
    const calls = stubApi({ 'admin.listTrainers': ok(emptyPage) });
    renderWithApi(<TrainersDirectoryView />);
    expect(
      await screen.findByText('No trainers match these filters', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(inputsOf(calls, 'admin.listTrainers')[0]).toMatchObject({ access: 'ACTIVE' });

    fireEvent.click(screen.getByRole('radio', { name: 'Revoked' }));
    expect(nav.router.replace).toHaveBeenCalledWith('/admin/trainers?access=REVOKED', {
      scroll: false,
    });

    const input = screen.getByRole('searchbox', { name: 'Search by club name' });
    fireEvent.change(input, { target: { value: 'L' } });
    await settle();
    expect(inputsOf(calls, 'admin.listTrainers').some((i) => 'clubQuery' in i)).toBe(false);

    fireEvent.change(input, { target: { value: 'Li' } });
    await waitFor(() =>
      expect(inputsOf(calls, 'admin.listTrainers').some((i) => i['clubQuery'] === 'Li')).toBe(true),
    );
    expect(nav.router.replace).toHaveBeenCalledWith('/admin/trainers?club=Li', { scroll: false });
  });
});

// ── 5.3 Activity ────────────────────────────────────────────────────────────

describe('ActivityView', () => {
  const page = sj(
    {
      items: [
        {
          id: 'clxact00000000000000000001',
          action: 'CLUB_DEACTIVATED',
          targetType: 'club',
          targetId: CLUB_A,
          createdAt: T,
          club: { id: CLUB_A, name: 'Liga de Atletismo de Bogotá' },
          details: {
            cancelledCertificationRequests: 1,
            rejectedMembershipInvitations: 1,
            revokedTrainerInvitations: 1,
          },
          actor: { isYou: true, email: null },
        },
        {
          id: 'clxact00000000000000000002',
          action: 'CLUB_UPDATED',
          targetType: 'club',
          targetId: CLUB_A,
          createdAt: T,
          club: { id: CLUB_A, name: 'Liga de Atletismo de Bogotá' },
          details: { changedFields: ['name', 'city'] },
          actor: { isYou: false, email: null },
        },
      ],
      nextCursor: null,
    },
    ['items.0.createdAt', 'items.1.createdAt'],
  );

  it('filters by ?club=, shows the club chip, sentences and details', async () => {
    nav.params = new URLSearchParams(`club=${CLUB_A}`);
    const calls = stubApi({ 'admin.listActions': ok(page) });
    renderWithApi(<ActivityView />);

    expect(
      await screen.findByText(/Club: Liga de Atletismo de Bogotá/, {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(inputsOf(calls, 'admin.listActions')[0]).toMatchObject({ clubId: CLUB_A });
    expect(screen.getByText(/^You deactivated/)).toBeTruthy();
    expect(screen.getByText(/^An admin edited/)).toBeTruthy();
    expect(screen.getByText(/Changed: name, city/)).toBeTruthy();
    expect(
      screen.getByText(
        /Cancelled: 1 certification request, 1 athlete invitation, 1 trainer invitation/,
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove club filter' }));
    expect(nav.router.replace).toHaveBeenCalledWith('/admin/activity', { scroll: false });
  });

  it('keeps the action filter in the URL and shows an empty state', async () => {
    nav.params = new URLSearchParams('action=TRAINER_INVITED');
    const calls = stubApi({ 'admin.listActions': ok(emptyPage) });
    renderWithApi(<ActivityView />);
    expect(
      await screen.findByText('No admin actions match these filters', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(inputsOf(calls, 'admin.listActions')[0]).toMatchObject({ action: 'TRAINER_INVITED' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Action' }), {
      target: { value: 'CLUB_CREATED' },
    });
    expect(nav.router.replace).toHaveBeenCalledWith('/admin/activity?action=CLUB_CREATED', {
      scroll: false,
    });
  });
});

// ── 5.4 Club list search and trainer filter ─────────────────────────────────

describe('ClubsView search and trainer filter', () => {
  it('?trainers=none sends withoutActiveTrainer with the status, and shows its empty state', async () => {
    nav.params = new URLSearchParams('status=DEACTIVATED&trainers=none');
    const calls = stubApi({ 'admin.listClubs': ok(emptyPage) });
    renderWithApi(<ClubsView />);
    expect(
      await screen.findByText('Every club here has an active trainer', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(inputsOf(calls, 'admin.listClubs')[0]).toMatchObject({
      status: 'DEACTIVATED',
      withoutActiveTrainer: true,
    });
    expect(
      screen.getByRole('button', { name: 'No active trainer' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('sends the search only from 2 characters, keeps it in ?q= with the status, and offers Clear search', async () => {
    nav.params = new URLSearchParams('status=DEACTIVATED');
    const calls = stubApi({ 'admin.listClubs': ok(emptyPage) });
    renderWithApi(<ClubsView />);
    expect(await screen.findByText('No deactivated clubs.', {}, { timeout: 5000 })).toBeTruthy();

    const input = screen.getByRole('searchbox', { name: 'Search clubs by name or slug' });
    fireEvent.change(input, { target: { value: 'l' } });
    await settle();
    expect(inputsOf(calls, 'admin.listClubs').some((i) => 'query' in i)).toBe(false);

    fireEvent.change(input, { target: { value: 'li' } });
    await waitFor(() =>
      expect(inputsOf(calls, 'admin.listClubs').some((i) => i['query'] === 'li')).toBe(true),
    );
    expect(inputsOf(calls, 'admin.listClubs').find((i) => i['query'] === 'li')).toMatchObject({
      status: 'DEACTIVATED',
    });
    expect(nav.router.replace).toHaveBeenCalledWith('/admin/clubs?status=DEACTIVATED&q=li', {
      scroll: false,
    });
    expect(await screen.findByText('No club matches “li”')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
  });
});
