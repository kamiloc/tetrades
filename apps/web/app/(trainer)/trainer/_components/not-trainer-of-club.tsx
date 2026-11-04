import Link from 'next/link';

import { buttonClasses } from '../../../../components/button';
import { PageBody } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { EmptyState } from '../../../../components/states';

// A club the signed-in user doesn't train, or that isn't active. Rendered by
// the club layout instead of its pages, so no club data loads.
export function NotTrainerOfClub() {
  return (
    <>
      <TopBar crumbs={[{ label: 'Trainer portal', href: '/trainer' }, { label: 'Club' }]} />
      <PageBody>
        <EmptyState
          icon="alert"
          title="You're not a trainer of this club"
          action={
            <Link href="/trainer/clubs" className={buttonClasses('secondary')}>
              Your clubs
            </Link>
          }
        >
          The club may have been deactivated, your trainer access may have been removed, or the
          link is wrong.
        </EmptyState>
      </PageBody>
    </>
  );
}
