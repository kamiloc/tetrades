'use client';

import Link from 'next/link';

import { buttonClasses } from '../../../../components/button';
import { PageBody } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { EmptyState } from '../../../../components/states';
import { useWebLocalization } from '../../../../lib/i18n';

// A club the signed-in user doesn't train, or that isn't active. Rendered by
// the club layout instead of its pages, so no club data loads.
export function NotTrainerOfClub() {
  const { t } = useWebLocalization();
  return (
    <>
      <TopBar crumbs={[{ label: t('portal.trainer'), href: '/trainer' }, { label: t('trainer.clubLabel') }]} />
      <PageBody>
        <EmptyState
          icon="alert"
          title={t('trainer.notTrainerTitle')}
          action={
            <Link href="/trainer/clubs" className={buttonClasses('secondary')}>
              {t('trainer.yourClubs')}
            </Link>
          }
        >
          {t('trainer.notTrainerBody')}
        </EmptyState>
      </PageBody>
    </>
  );
}
