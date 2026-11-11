import type { ReactNode } from 'react';

import { PortalShell } from '../../../../components/portal-shell';
import type { NavSection } from '../../../../components/sidebar-nav';
import type { SessionUser } from '../../../../lib/session';

// The trainer portal frame. Home pages (/trainer, the picker, invitations)
// use the generic nav; club pages pass their own nav and the club switcher.

export const HOME_SECTIONS: NavSection[] = [
  {
    title: 'Trainer',
    items: [
      { href: '/trainer/clubs', label: 'Clubs', icon: 'flag' },
      { href: '/trainer/invitations', label: 'Invitations', icon: 'link' },
    ],
  },
];

export function clubSections(clubId: string): NavSection[] {
  const base = `/trainer/clubs/${clubId}`;
  return [
    {
      title: 'Club',
      items: [
        { href: `${base}/athletes`, label: 'Athletes', icon: 'users' },
        { href: `${base}/certifications`, label: 'Certifications', icon: 'check' },
      ],
    },
    {
      title: 'Account',
      items: [{ href: '/trainer/invitations', label: 'Trainer invitations', icon: 'link' }],
    },
  ];
}

export function TrainerShell({
  user,
  sections = HOME_SECTIONS,
  header,
  children,
}: {
  user: SessionUser | null;
  sections?: NavSection[];
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PortalShell
      role="Trainer portal"
      tone="amber"
      sections={sections}
      header={header}
      user={{ email: user?.email ?? 'Signed in', sub: 'Trainer access' }}
    >
      {children}
    </PortalShell>
  );
}
