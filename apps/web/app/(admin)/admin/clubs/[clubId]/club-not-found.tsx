import Link from 'next/link';

import { buttonClasses } from '../../../../../components/button';
import { PageBody } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { EmptyState } from '../../../../../components/states';

export function ClubNotFound() {
  return (
    <>
      <TopBar crumbs={[{ label: 'Clubs', href: '/admin/clubs' }, { label: 'Not found' }]} />
      <PageBody>
        <EmptyState
          title="Club not found"
          action={
            <Link href="/admin/clubs" className={buttonClasses('secondary')}>
              Back to clubs
            </Link>
          }
        >
          This club doesn&apos;t exist, or the link is wrong.
        </EmptyState>
      </PageBody>
    </>
  );
}
