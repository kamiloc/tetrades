import type { NavSection } from '../components/sidebar-nav';

// The admin sidebar. Overview is the index page, so it is current only on an
// exact match and not on every /admin/* page.
export const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'nav.manage',
    items: [
      { href: '/admin', label: 'nav.overview', icon: 'grid', exact: true },
      { href: '/admin/clubs', label: 'nav.clubs', icon: 'flag' },
      { href: '/admin/trainers', label: 'nav.trainers', icon: 'users' },
      { href: '/admin/activity', label: 'nav.activity', icon: 'activity' },
    ],
  },
];
