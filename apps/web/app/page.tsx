import Link from 'next/link';

import { ApMark } from '../components/ap-mark';
import { buttonClasses } from '../components/button';

// Placeholder root until the public athlete pages (Change 9). No redirect, so
// it can never point at a removed route.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink px-6 text-on-ink">
      <ApMark size={48} onDark />
      <h1 className="text-[26px] font-bold tracking-[-0.6px]">The Athlete Passport</h1>
      <Link href="/login" lang="en" className={buttonClasses('primary')}>
        Sign in to the portal
      </Link>
    </main>
  );
}
