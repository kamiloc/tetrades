import type { Metadata } from 'next';

import { ApMark } from '../../components/ap-mark';
import { safeNext } from '../../lib/safe-next';
import { getServerLocalization } from '../../lib/server-i18n';

import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerLocalization();
  return { title: t('login.metaTitle') };
}
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, { t }] = await Promise.all([searchParams, getServerLocalization()]);
  const next = safeNext(first(params['next'])) ?? '';
  const linkFailed = first(params['error']) === 'link';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <ApMark size={32} />
          <span className="text-[15px] font-bold tracking-[-0.2px] text-text">
            {t('common.appTitle')}
          </span>
        </div>
        <div className="rounded-[16px] border border-line bg-paper p-6 shadow-sm">
          <h1 className="text-[22px] font-bold tracking-[-0.4px] text-text">
            {t('login.heading')}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {t('login.intro')}
          </p>
          <div className="mt-5">
            <LoginForm next={next} linkFailed={linkFailed} />
          </div>
        </div>
      </div>
    </main>
  );
}
