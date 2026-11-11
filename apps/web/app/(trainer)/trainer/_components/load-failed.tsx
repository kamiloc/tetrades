'use client';

import { useRouter } from 'next/navigation';

import { ErrorState } from '../../../../components/states';
import { useWebLocalization } from '../../../../lib/i18n';

// The API couldn't be reached to list the caller's clubs.
export function LoadFailed() {
  const { t } = useWebLocalization();
  const router = useRouter();
  return (
    <ErrorState title={t('trainer.loadClubsFailed')} onRetry={() => router.refresh()}>
      {t('common.serverUnreachable')}
    </ErrorState>
  );
}
