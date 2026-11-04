import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PortalShell } from '../../../components/portal-shell';
import type { NavSection } from '../../../components/sidebar-nav';
import { getSessionUser } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// add-trainer-portal adds the coaching sections.
const SECTIONS: NavSection[] = [
  { title: 'Club', items: [{ href: '/trainer/invitations', label: 'Invitations', icon: 'link' }] },
];

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user === null) redirect('/login?next=%2Ftrainer%2Finvitations');

  return (
    <PortalShell
      role="Trainer portal"
      tone="amber"
      sections={SECTIONS}
      user={{ email: user.email ?? 'Signed in', sub: 'Trainer access' }}
    >
      {children}
    </PortalShell>
  );
}
