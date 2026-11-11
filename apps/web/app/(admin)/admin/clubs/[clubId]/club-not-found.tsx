'use client';

import Link from 'next/link';

import { buttonClasses } from '../../../../../components/button';
import { PageBody } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { EmptyState } from '../../../../../components/states';
import { useWebLocalization } from '../../../../../lib/i18n';

export function ClubNotFound() {
  const { t } = useWebLocalization();
  return (
    <>
      <TopBar crumbs={[{ label: t('nav.clubs'), href: '/admin/clubs' }, { label: t('admin.notFound') }]} />
      <PageBody>
        <EmptyState
          title={t('admin.clubNotFound')}
          action={
            <Link href="/admin/clubs" className={buttonClasses('secondary')}>
              {t('admin.backToClubs')}
            </Link>
          }
        >
          {t('admin.clubNotFoundBody')}
        </EmptyState>
      </PageBody>
    </>
  );
}
