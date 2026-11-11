import Link from 'next/link';

import { ApMark } from '../components/ap-mark';
import { buttonClasses } from '../components/button';
import { getServerLocalization } from '../lib/server-i18n';

// Placeholder root until the public athlete pages (Change 9). No redirect, so
// it can never point at a removed route.
export default async function HomePage() {
  const { t } = await getServerLocalization();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink px-6 text-on-ink">
      <ApMark size={48} onDark />
      <h1 className="text-[26px] font-bold tracking-[-0.6px]">{t('common.appTitle')}</h1>
      <Link href="/login" className={buttonClasses('primary')}>
        {t('home.signIn')}
      </Link>
    </main>
  );
}
