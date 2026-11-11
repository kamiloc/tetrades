'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '../app/auth/actions';
import { useWebLocalization } from '../lib/i18n';
import type { MessageKey } from '../lib/translations';

import { ApMark } from './ap-mark';
import { focusRing } from './focus';
import { Icon } from './icon';
import { SidebarNav, type NavSection } from './sidebar-nav';

// The admin and trainer portal frame (prototype PSidebar + PMain). It lays out
// without horizontal scrolling from 1024 px up.

export type RoleTone = 'blue' | 'amber';

export interface PortalUser {
  /** Null shows `fallback` instead. */
  email: string | null;
  fallback: MessageKey;
  sub: MessageKey;
}

function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : local.slice(0, 2);
  return letters.toUpperCase() || '?';
}

export function Sidebar({
  role,
  tone,
  sections,
  user,
  header,
}: {
  role: MessageKey;
  tone: RoleTone;
  sections: NavSection[];
  user: PortalUser;
  /** Shown under the brand, above the nav (the trainer club switcher). */
  header?: ReactNode;
}) {
  const { t } = useWebLocalization();
  const email = user.email ?? t(user.fallback);
  return (
    <aside className="sticky top-0 flex h-screen w-[252px] shrink-0 flex-col border-r border-ink-edge bg-gradient-to-b from-ink via-ink2 via-60% to-ink-deep text-on-ink">
      <div className="flex items-center gap-[11px] border-b border-ink-line px-[18px] pb-4 pt-[18px]">
        <ApMark size={28} onDark />
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-[14.5px] font-bold tracking-[-0.2px]">{t('common.brand')}</span>
          <span
            className={`mt-[3px] text-[10px] font-bold uppercase tracking-[1.6px] ${tone === 'amber' ? 'text-role-amber' : 'text-role-blue'}`}
          >
            {t(role)}
          </span>
        </div>
      </div>
      {header ? <div className="border-b border-ink-line px-3 py-3">{header}</div> : null}
      <SidebarNav sections={sections} />
      <div className="mt-auto p-3">
        <div className="flex items-center gap-2.5 rounded-[10px] border border-ink-line bg-on-ink/[0.02] p-2">
          <span
            aria-hidden="true"
            className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue2 text-[12px] font-bold"
          >
            {initials(email)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold" title={email}>
              {email}
            </div>
            <div className="mt-px text-[11px] text-on-ink2">{t(user.sub)}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t('common.signOut')}
              title={t('common.signOut')}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-on-ink2 ring-offset-ink hover:bg-ink3 hover:text-on-ink ${focusRing}`}
            >
              <Icon name="logOut" size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function TopBar({ crumbs, action }: { crumbs: Crumb[]; action?: ReactNode }) {
  const { t } = useWebLocalization();
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-line bg-paper px-7">
      <nav aria-label={t('common.breadcrumb')} className="min-w-0">
        <ol className="flex items-center gap-2 text-[13px]">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 ? (
                  <Icon name="chevronRight" size={12} className="shrink-0 text-subtle" />
                ) : null}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className={`truncate rounded-sm font-medium text-muted hover:text-text ${focusRing}`}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={`truncate ${last ? 'font-semibold text-text' : 'font-medium text-muted'}`}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="flex-1" />
      {action}
    </header>
  );
}

export function PortalShell({
  role,
  tone,
  sections,
  user,
  header,
  children,
}: {
  role: MessageKey;
  tone: RoleTone;
  sections: NavSection[];
  user: PortalUser;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-portal bg-canvas">
      <Sidebar role={role} tone={tone} sections={sections} user={user} header={header} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
