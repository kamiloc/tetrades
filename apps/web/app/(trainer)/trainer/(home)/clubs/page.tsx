import Link from 'next/link';
import { redirect } from 'next/navigation';

import { focusRing } from '../../../../../components/focus';
import { Icon } from '../../../../../components/icon';
import { PageBody, PageHeader } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { getServerLocalization } from '../../../../../lib/server-i18n';
import { clubRosterPath } from '../../../../../lib/trainer/landing';
import { loadMyTrainerClubs } from '../../../../../lib/trainer/my-clubs';
import { LoadFailed } from '../../_components/load-failed';
import { NoClub } from '../../_components/no-club';

export const dynamic = 'force-dynamic';

// The club picker for a trainer of several clubs.
export default async function TrainerClubsPage() {
  const [result, { t }] = await Promise.all([loadMyTrainerClubs(), getServerLocalization()]);
  if (result.status === 'signed-out') redirect('/login');

  return (
    <>
      <TopBar crumbs={[{ label: t('portal.trainer'), href: '/trainer' }, { label: t('nav.clubs') }]} />
      <PageBody>
        <PageHeader title={t('trainer.yourClubs')} sub={t('trainer.chooseClub')} />
        {result.status !== 'ok' ? (
          <LoadFailed />
        ) : result.clubs.length === 0 ? (
          <NoClub />
        ) : (
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {result.clubs.map((club) => (
              <li key={club.id}>
                <Link
                  href={clubRosterPath(club.id)}
                  className={`flex items-center gap-3 rounded-[14px] border border-line bg-paper px-[18px] py-4 shadow-sm hover:border-blue-line hover:bg-blue-tint ${focusRing}`}
                >
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[14px] font-semibold text-text">
                      {club.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">
                      {club.city ? `${club.city}, ${club.countryCode}` : club.countryCode}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={14} className="shrink-0 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
