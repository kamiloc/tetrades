import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar, resetNextMocks } from '../../../../../test/next-mocks';
import { SESSION_COOKIE, sessionCookieValue, stubAuthEnv } from '../../../../../test/supabase-stub';

vi.mock('next/headers', async () => (await import('../../../../../test/next-mocks')).nextHeaders);
vi.mock('next/navigation', async () => ({
  ...(await import('../../../../../test/next-mocks')).nextNavigation,
  usePathname: () => '/trainer/clubs/clxclub0000000000000000001/athletes',
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));
vi.mock('../../../../auth/actions', () => ({ signOut: async () => undefined }));

const CLUB_A = 'clxclub0000000000000000001';
const CLUB_B = 'clxclub0000000000000000002';
const OTHER_CLUB = 'clxclub0000000000000000009';

const club = (id: string, name: string) => ({
  club: { id, slug: name.toLowerCase().replace(/\s+/g, '-'), name, countryCode: 'CO', city: 'Medellín', isActive: true },
});

/** Stubs Supabase auth and the API; records every API procedure called. */
function stubBackends() {
  const procedures: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      if (url.includes('/auth/v1/user')) {
        return Response.json({
          id: 'u1',
          aud: 'authenticated',
          email: 'andres.gomez@example.co',
          email_confirmed_at: '2026-10-01T00:00:00Z',
          app_metadata: {},
          user_metadata: {},
          created_at: '',
        });
      }
      const path = new URL(url).pathname.split('/trpc/')[1] ?? '';
      procedures.push(...decodeURIComponent(path).split(','));
      if (path.startsWith('club.listMyTrainerClubs')) {
        return Response.json({
          result: {
            data: {
              json: {
                items: [club(CLUB_A, 'Club Atletismo Antioquia'), club(CLUB_B, 'Liga de Natación del Valle')],
                nextCursor: null,
              },
            },
          },
        });
      }
      return Response.json({}, { status: 500 });
    }),
  );
  return procedures;
}

async function renderLayout(clubId: string): Promise<string> {
  const { default: TrainerClubLayout } = await import('./layout');
  return renderToStaticMarkup(
    await TrainerClubLayout({
      children: <p>club page</p>,
      params: Promise.resolve({ clubId }),
    }),
  );
}

describe('trainer club layout guard', () => {
  beforeEach(() => {
    resetNextMocks();
    stubAuthEnv();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/trpc');
    cookieJar.set(SESSION_COOKIE, { name: SESSION_COOKIE, value: sessionCookieValue('token', 3600) });
  });

  it("shows the not-a-trainer page for another club's id, with no roster request", async () => {
    const procedures = stubBackends();
    const html = await renderLayout(OTHER_CLUB);
    expect(html).toContain('not a trainer of this club');
    expect(html).not.toContain('<p>club page</p>');
    expect(procedures).toEqual(['club.listMyTrainerClubs']);
    expect(procedures).not.toContain('club.listRoster');
  });

  it('shows a trained club with its name, the nav and a switcher listing the other club', async () => {
    stubBackends();
    const html = await renderLayout(CLUB_A);
    expect(html).toContain('<p>club page</p>');
    expect(html).toContain('Club Atletismo Antioquia');
    expect(html).toContain(`href="/trainer/clubs/${CLUB_A}/athletes"`);
    expect(html).toContain(`href="/trainer/clubs/${CLUB_A}/certifications"`);
    expect(html).toContain('href="/trainer/invitations"');
    expect(html).toMatch(new RegExp(`<option value="${CLUB_B}"[^>]*>Liga de Natación del Valle</option>`));
    expect(html).toMatch(new RegExp(`<option value="${CLUB_A}" selected=""`));
  });
});
