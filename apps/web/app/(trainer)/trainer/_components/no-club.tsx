'use client';

import Link from 'next/link';

import { buttonClasses } from '../../../../components/button';
import { EmptyState } from '../../../../components/states';
import { useWebLocalization } from '../../../../lib/i18n';

// A signed-in user who trains no active club (spec: "No club").
export function NoClub() {
  const { t } = useWebLocalization();
  return (
    <EmptyState
      icon="flag"
      title={t('trainer.noClubTitle')}
      action={
        <Link href="/trainer/invitations" className={buttonClasses('primary')}>
          {t('trainer.seeInvitations')}
        </Link>
      }
    >
      {t('trainer.noClubBody')}
    </EmptyState>
  );
}
