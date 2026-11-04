'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { focusRing } from './focus';
import { Icon, type IconName } from './icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  return (
    <>
      {sections.map((section, index) => (
        <nav
          key={section.title}
          aria-label={section.title}
          className={`flex flex-col gap-0.5 px-3 ${index === 0 ? 'pt-3.5' : 'mt-1.5 border-t border-ink-line pt-3'}`}
        >
          <div className="px-3 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-on-ink3">
            {section.title}
          </div>
          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-[10px] border py-[9px] pl-3.5 pr-3 text-[13.5px] ring-offset-ink ${
                  active
                    ? 'border-blue/30 bg-blue/15 font-semibold text-on-ink'
                    : 'border-transparent font-medium text-on-ink/80 hover:bg-ink3 hover:text-on-ink'
                } ${focusRing}`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-r-[3px] bg-blue shadow-[0_0_12px_rgba(26,107,255,0.5)]"
                  />
                ) : null}
                <Icon name={item.icon} size={17} strokeWidth={active ? 2 : 1.75} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ))}
    </>
  );
}
