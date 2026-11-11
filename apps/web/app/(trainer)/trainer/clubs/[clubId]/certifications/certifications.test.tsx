// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDialogPolyfill } from '../../../../../../test/dialog-polyfill';
import { ok, renderWithApi, sj, stubApi, trpcError, type Reply } from '../../../../../../test/trpc-stub';

import { CertificationsView } from './certifications-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

const CLUB = 'clxclub0000000000000000001';

const myClubs = ok(
  sj({
    items: [{ club: { id: CLUB, slug: 'liga-pesas-valle', name: 'Liga de Pesas del Valle', countryCode: 'CO', city: 'Cali', isActive: true } }],
    nextCursor: null,
  }),
);

const request = {
  id: 'clxreq00000000000000000001',
  requestedAt: '2026-10-28T12:00:00.000Z',
  achievement: { title: 'Oro en arranque 59 kg', organization: 'Juegos Nacionales 2025', achievedOn: '2025-11-20T12:00:00.000Z' },
  athlete: { id: 'clxath00000000000000000001', slug: 'yenny-alvarez', displayName: 'Yenny Álvarez' },
};

const queueWith = (items: (typeof request)[]): Reply => ({
  result: {
    data: sj(
      { items, nextCursor: null },
      items.flatMap((_, i) => [`items.${i}.requestedAt`, `items.${i}.achievement.achievedOn`]),
    ),
  },
});

/** The queue holds the request until a decision succeeds. */
function queueApi(decide: () => Reply) {
  let decided = false;
  return stubApi({
    'club.listMyTrainerClubs': myClubs,
    'achievement.listPendingCertifications': () => queueWith(decided ? [] : [request]),
    'achievement.decideCertification': () => {
      const reply = decide();
      if (!('error' in reply)) decided = true;
      return reply;
    },
  });
}

const decidedOk = () => ({ result: { data: sj({ id: request.id, status: 'APPROVED' }) } });

beforeAll(installDialogPolyfill);
afterEach(cleanup);

describe('CertificationsView', () => {
  it('approves after confirming, and the row leaves the queue after the refresh', async () => {
    const calls = queueApi(decidedOk);
    renderWithApi(<CertificationsView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve Oro en arranque 59 kg' }, { timeout: 5000 }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Oro en arranque 59 kg')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Nothing to review', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText('Certified "Oro en arranque 59 kg" for Yenny Álvarez.')).toBeTruthy();
    expect(calls.find((c) => c.procedure === 'achievement.decideCertification')?.input).toEqual({
      clubId: CLUB,
      requestId: request.id,
      decision: 'APPROVE',
    });
  });

  it('asks for a reason and sends nothing when rejecting with an empty one', async () => {
    const calls = queueApi(decidedOk);
    renderWithApi(<CertificationsView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject Oro en arranque 59 kg' }, { timeout: 5000 }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));

    expect(await within(dialog).findByText('Give the athlete a reason.')).toBeTruthy();
    expect(calls.some((c) => c.procedure === 'achievement.decideCertification')).toBe(false);
  });

  it('sends a rejection with its reason', async () => {
    const calls = queueApi(decidedOk);
    renderWithApi(<CertificationsView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject Oro en arranque 59 kg' }, { timeout: 5000 }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'El acta de la federación no coincide con la fecha.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(calls.find((c) => c.procedure === 'achievement.decideCertification')?.input).toEqual({
        clubId: CLUB,
        requestId: request.id,
        decision: 'REJECT',
        rejectionReason: 'El acta de la federación no coincide con la fecha.',
      }),
    );
  });

  it('says the request is no longer pending on BAD_REQUEST, and refreshes the queue', async () => {
    const calls = queueApi(() => trpcError('BAD_REQUEST', 400));
    renderWithApi(<CertificationsView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve Oro en arranque 59 kg' }, { timeout: 5000 }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(
      await within(dialog).findByText('This request is no longer pending. The queue has been refreshed.', {}, { timeout: 3000 }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(calls.filter((c) => c.procedure === 'achievement.listPendingCertifications').length).toBe(2),
    );
  });

  it('says the athlete is no longer a member on FORBIDDEN while still a trainer', async () => {
    queueApi(() => trpcError('FORBIDDEN', 403));
    renderWithApi(<CertificationsView clubId={CLUB} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve Oro en arranque 59 kg' }, { timeout: 5000 }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(
      await within(dialog).findByText('This athlete is no longer an active member of the club.', {}, { timeout: 3000 }),
    ).toBeTruthy();
  });

  it('shows the empty state for an empty queue', async () => {
    stubApi({
      'club.listMyTrainerClubs': myClubs,
      'achievement.listPendingCertifications': () => queueWith([]),
    });
    renderWithApi(<CertificationsView clubId={CLUB} />);
    expect(await screen.findByText('Nothing to review', {}, { timeout: 5000 })).toBeTruthy();
  });
});
