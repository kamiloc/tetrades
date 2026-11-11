import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { NotAuthorized } from '../../../components/not-authorized';
import { PortalShell } from '../../../components/portal-shell';
import type { NavSection } from '../../../components/sidebar-nav';
import { createServerApi, getApiErrorCode } from '../../../lib/server-api';
import { getSessionUser } from '../../../lib/session';

import { AccessCheckFailed } from './access-check-failed';

export const dynamic = 'force-dynamic';

const SECTIONS: NavSection[] = [
  { title: 'nav.manage', items: [{ href: '/admin/clubs', label: 'nav.clubs', icon: 'flag' }] },
];

type Access = 'admin' | 'forbidden' | 'signed-out' | 'unavailable';

async function checkAccess(): Promise<Access> {
  const api = await createServerApi();
  try {
    await api.admin.whoAmI.query();
    return 'admin';
  } catch (error) {
    const code = getApiErrorCode(error);
    if (code === 'FORBIDDEN') return 'forbidden';
    if (code === 'UNAUTHORIZED') return 'signed-out';
    return 'unavailable';
  }
}

// Presentation guard (design D4): only an account the API recognizes as an
// admin sees the admin shell. Every page still loads its data through the
// API, which re-checks the role on each call.
// Signed out: middleware already redirected with the exact `next`; this is
// a fallback for a session that ended meanwhile.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [access, user] = await Promise.all([checkAccess(), getSessionUser()]);

  if (access === 'signed-out' || user === null) redirect('/login');
  if (access === 'forbidden') return <NotAuthorized email={user.email} />;
  if (access === 'unavailable') return <AccessCheckFailed />;

  return (
    <PortalShell
      role="portal.admin"
      tone="blue"
      sections={SECTIONS}
      user={{ email: user.email, fallback: 'portal.adminFallback', sub: 'portal.platformAdmin' }}
    >
      {children}
    </PortalShell>
  );
}
