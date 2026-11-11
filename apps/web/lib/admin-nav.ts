import type { NavSection } from '../components/sidebar-nav';

// The admin sidebar. Overview is the index page, so it is current only on an
// exact match and not on every /admin/* page.
export const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Manage',
    items: [
      { href: '/admin', label: 'Overview', icon: 'grid', exact: true },
      { href: '/admin/clubs', label: 'Clubs', icon: 'flag' },
      { href: '/admin/trainers', label: 'Trainers', icon: 'users' },
      { href: '/admin/activity', label: 'Activity', icon: 'activity' },
    ],
  },
];
