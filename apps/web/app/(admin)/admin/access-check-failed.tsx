'use client';

import { useRouter } from 'next/navigation';

import { ErrorState } from '../../../components/states';
import { useWebLocalization } from '../../../lib/i18n';

// The API couldn't be reached to confirm admin access.
export function AccessCheckFailed() {
  const { t } = useWebLocalization();
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[440px] rounded-[16px] border border-line bg-paper shadow-sm">
        <ErrorState title={t('access.checkFailed')} onRetry={() => router.refresh()}>
          {t('common.serverUnreachable')}
        </ErrorState>
      </div>
    </main>
  );
}
