import type { ReactNode } from 'react';

import { PortalShell } from '../../../../components/portal-shell';
import type { NavSection } from '../../../../components/sidebar-nav';
import type { SessionUser } from '../../../../lib/session';

// The trainer portal frame. Home pages (/trainer, the picker, invitations)
// use the generic nav; club pages pass their own nav and the club switcher.

export const HOME_SECTIONS: NavSection[] = [
  {
    title: 'nav.trainer',
    items: [
      { href: '/trainer/clubs', label: 'nav.clubs', icon: 'flag' },
      { href: '/trainer/invitations', label: 'nav.invitations', icon: 'link' },
    ],
  },
];

export function clubSections(clubId: string): NavSection[] {
  const base = `/trainer/clubs/${clubId}`;
  return [
    {
      title: 'nav.club',
      items: [
        { href: `${base}/athletes`, label: 'nav.athletes', icon: 'users' },
        { href: `${base}/certifications`, label: 'nav.certifications', icon: 'check' },
      ],
    },
    {
      title: 'nav.account',
      items: [{ href: '/trainer/invitations', label: 'nav.trainerInvitations', icon: 'link' }],
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
      role="portal.trainer"
      tone="amber"
      sections={sections}
      header={header}
      user={{ email: user?.email ?? null, fallback: 'portal.signedIn', sub: 'portal.trainerAccess' }}
    >
      {children}
    </PortalShell>
  );
}
