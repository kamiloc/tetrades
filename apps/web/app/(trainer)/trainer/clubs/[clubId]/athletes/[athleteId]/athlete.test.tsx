// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDialogPolyfill } from '../../../../../../../test/dialog-polyfill';
import { ok, renderWithApi, sj, stubApi, trpcError, type Reply } from '../../../../../../../test/trpc-stub';

import { AthleteView } from './athlete-view';

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
const OTHER_CLUB = 'clxclub0000000000000000002';
const SPORT = { id: 'clxsport000000000000000001', name: 'Atletismo' };
const ATHLETE = { id: 'clxath00000000000000000001', slug: 'anthony-zambrano', displayName: 'Anthony Zambrano', sport: SPORT };
const TRAINER_ROW = 'clxtrainerrow0000000000001';
const SPRINT = 'clxdef00000000000000000001';
const MASS = 'clxdef00000000000000000002';
const SWIM = 'clxdef00000000000000000003';

const myClubs = ok(
  sj({
    items: [{ club: { id: CLUB, slug: 'liga-atletismo-cordoba', name: 'Liga de Atletismo de Córdoba', countryCode: 'CO', city: 'Montería', isActive: true } }],
    nextCursor: null,
  }),
);

const rosterAthlete = (status: 'ACTIVE' | 'PENDING_ATHLETE_CONFIRMATION') =>
  ok(
    sj(
      { id: 'clxmem00000000000000000001', status, createdAt: '2026-09-01T12:00:00.000Z', respondedAt: null, athlete: ATHLETE },
      ['createdAt'],
    ),
  );

const definitions = ok(
  sj({
    items: [
      { id: SPRINT, key: 'sprint_400m', name: '400 m planos', unit: 's', direction: 'LOWER_IS_BETTER', sportId: SPORT.id },
      { id: MASS, key: 'body_mass', name: 'Masa corporal', unit: 'kg', direction: 'NEUTRAL', sportId: null },
      { id: SWIM, key: 'swim_50m', name: '50 m libre', unit: 's', direction: 'LOWER_IS_BETTER', sportId: 'clxsport000000000000000002' },
    ],
    nextCursor: null,
  }),
);

const summaries = ok(
  sj(
    [
      { metricDefinitionId: SPRINT, latestValue: 44.6, latestMeasuredAt: '2026-10-10T12:00:00.000Z', entryCount: 2, bestValue: 44.2, bestMeasuredAt: '2026-09-15T12:00:00.000Z' },
    ],
    ['0.latestMeasuredAt', '0.bestMeasuredAt'],
  ),
);

const entries = ok(
  sj(
    {
      items: [
        { id: 'clxent00000000000000000001', metricDefinitionId: SPRINT, reportedByClubTrainerId: TRAINER_ROW, value: 44.6, measuredAt: '2026-10-10T12:00:00.000Z', createdAt: '2026-10-10T12:00:00.000Z', clubId: CLUB },
        { id: 'clxent00000000000000000002', metricDefinitionId: SPRINT, reportedByClubTrainerId: 'clxtrainerrow0000000000002', value: 44.2, measuredAt: '2026-09-15T12:00:00.000Z', createdAt: '2026-09-15T12:00:00.000Z', clubId: OTHER_CLUB },
      ],
      nextCursor: null,
    },
    ['items.0.measuredAt', 'items.0.createdAt', 'items.1.measuredAt', 'items.1.createdAt'],
  ),
);

const reported = ok(
  sj(
    { id: 'clxent00000000000000000003', metricDefinitionId: SPRINT, reportedByClubTrainerId: TRAINER_ROW, value: 44.1, measuredAt: '2026-11-04T12:00:00.000Z', createdAt: '2026-11-04T12:00:00.000Z', clubId: CLUB },
    ['measuredAt', 'createdAt'],
  ),
);

function activeApi(extra: Record<string, (input: unknown) => Reply> = {}) {
  return stubApi({
    'club.listMyTrainerClubs': myClubs,
    'club.getRosterAthlete': rosterAthlete('ACTIVE'),
    'metric.listDefinitions': definitions,
    'metric.getSummaries': summaries,
    'metric.listEntries': entries,
    ...extra,
  });
}

beforeAll(installDialogPolyfill);
afterEach(cleanup);

describe('AthleteView', () => {
  it('labels entries by club, never by trainer', async () => {
    activeApi();
    const { container } = renderWithApi(<AthleteView clubId={CLUB} athleteId={ATHLETE.id} />);

    const table = await screen.findByRole('table', {}, { timeout: 5000 });
    await within(table).findByText('Reported by Liga de Atletismo de Córdoba', {}, { timeout: 3000 });
    expect(within(table).getByText('Reported by another club')).toBeTruthy();
    expect(container.innerHTML).not.toContain(TRAINER_ROW);
    expect(container.innerHTML).not.toContain('clxtrainerrow0000000000002');
  });

  it('shows latest and best summaries with units and dates', async () => {
    activeApi();
    renderWithApi(<AthleteView clubId={CLUB} athleteId={ATHLETE.id} />);
    const list = await screen.findByRole('list', { name: 'Metric summaries' }, { timeout: 5000 });
    await within(list).findByText('400 m planos', {}, { timeout: 3000 });
    expect(within(list).getByText('44.6 s')).toBeTruthy();
    expect(within(list).getByText('44.2 s')).toBeTruthy();
    expect(within(list).getByText('Oct 10, 2026')).toBeTruthy();
  });

  it('shows the awaiting-confirmation state for a pending invitee, with no metrics', async () => {
    const calls = stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.getRosterAthlete': rosterAthlete('PENDING_ATHLETE_CONFIRMATION'),
    });
    renderWithApi(<AthleteView clubId={CLUB} athleteId={ATHLETE.id} />);
    expect(await screen.findByText('Waiting for the athlete to confirm', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Log metric/ })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    const procedures = calls.map((c) => c.procedure);
    expect(procedures).not.toContain('metric.getSummaries');
    expect(procedures).not.toContain('metric.listEntries');
  });

  it('shows athlete not found for NOT_FOUND', async () => {
    stubApi({
      'club.listMyTrainerClubs': myClubs,
      'club.getRosterAthlete': () => trpcError('NOT_FOUND', 404),
    });
    renderWithApi(<AthleteView clubId={CLUB} athleteId={ATHLETE.id} />);
    expect(await screen.findByText('Athlete not found', {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe('LogMetricDialog', () => {
  async function openDialog() {
    renderWithApi(<AthleteView clubId={CLUB} athleteId={ATHLETE.id} />);
    await screen.findByRole('table', {}, { timeout: 5000 });
    const open = await screen.findByRole('button', { name: 'Log metric' });
    await waitFor(() => expect((open as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog');
    return {
      dialog,
      metric: within(dialog).getByLabelText('Metric') as HTMLSelectElement,
      day: within(dialog).getByLabelText('Measured on') as HTMLInputElement,
      fill: (value: string) => fireEvent.change(within(dialog).getByLabelText(/^Value/), { target: { value } }),
      save: () => fireEvent.click(within(dialog).getByRole('button', { name: 'Save entry' })),
    };
  }

  it("offers the athlete's sport metrics and the general ones only", async () => {
    activeApi();
    const { metric } = await openDialog();
    const options = [...metric.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Choose a metric', '400 m planos (s)', 'Masa corporal (kg)']);
    expect([...metric.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['Atletismo metrics', 'General']);
  });

  it('saves a valid entry and refreshes summaries and entries', async () => {
    const calls = activeApi({ 'metric.reportEntry': reported });
    const { dialog, metric, fill, save } = await openDialog();

    fireEvent.change(metric, { target: { value: SPRINT } });
    fill('44,1');
    save();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 });
    expect(dialog.hasAttribute('open')).toBe(false);
    const sent = calls.find((c) => c.procedure === 'metric.reportEntry')?.input as Record<string, unknown>;
    expect(sent).toMatchObject({ clubId: CLUB, athleteId: ATHLETE.id, metricDefinitionId: SPRINT, value: 44.1 });
    expect(new Date(String(sent['measuredAt'])).getTime()).toBeLessThanOrEqual(Date.now());
    await waitFor(() => {
      expect(calls.filter((c) => c.procedure === 'metric.getSummaries').length).toBe(2);
      expect(calls.filter((c) => c.procedure === 'metric.listEntries').length).toBe(2);
    });
    expect(await screen.findByText('Metric logged')).toBeTruthy();
  });

  it("shows the device-time message on a clock-skew BAD_REQUEST and keeps the form", async () => {
    activeApi({ 'metric.reportEntry': () => trpcError('BAD_REQUEST', 400) });
    const { dialog, metric, fill, save } = await openDialog();

    fireEvent.change(metric, { target: { value: SPRINT } });
    fill('44.1');
    save();

    expect(
      await within(dialog).findByText(
        "The date can't be in the future. Check your device's date and time.",
        {},
        { timeout: 3000 },
      ),
    ).toBeTruthy();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect((within(dialog).getByLabelText(/^Value/) as HTMLInputElement).value).toBe('44.1');
    expect(metric.value).toBe(SPRINT);
  });

  it('sends nothing for a future date or a non-number', async () => {
    const calls = activeApi({ 'metric.reportEntry': reported });
    const { dialog, metric, day, fill, save } = await openDialog();

    fireEvent.change(metric, { target: { value: SPRINT } });
    fill('44.1');
    fireEvent.change(day, { target: { value: '2099-01-01' } });
    save();
    expect(await within(dialog).findByText("The date can't be in the future.")).toBeTruthy();

    fireEvent.change(day, { target: { value: '2026-10-01' } });
    fill('rápido');
    save();
    expect(await within(dialog).findByText('Enter a number, like 11.42.')).toBeTruthy();
    expect(calls.some((c) => c.procedure === 'metric.reportEntry')).toBe(false);
  });
});
