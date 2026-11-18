import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PageBody } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { getServerLocalization } from '../../../../../lib/server-i18n';
import { getSessionUser } from '../../../../../lib/session';
import { loadMyTrainerClubs } from '../../../../../lib/trainer/my-clubs';
import { ClubSwitcher } from '../../_components/club-switcher';
import { LoadFailed } from '../../_components/load-failed';
import { NotTrainerOfClub } from '../../_components/not-trainer-of-club';
import { clubSections, TrainerShell } from '../../_components/trainer-shell';

export const dynamic = 'force-dynamic';

// Club guard (design D1): decided once, server-side, from the caller's own
// clubs. A club they don't train renders NotTrainerOfClub and no children, so
// no club query runs. The API still checks every call.
export default async function TrainerClubLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const [{ clubId }, user, result, { t }] = await Promise.all([
    params,
    getSessionUser(),
    loadMyTrainerClubs(),
    getServerLocalization(),
  ]);
  if (result.status === 'signed-out') redirect('/login');

  if (result.status === 'unavailable') {
    return (
      <TrainerShell user={user}>
        <TopBar crumbs={[{ label: t('portal.trainer'), href: '/trainer' }, { label: t('trainer.clubLabel') }]} />
        <PageBody>
          <LoadFailed />
        </PageBody>
      </TrainerShell>
    );
  }

  const club = result.clubs.find((c) => c.id === clubId);
  if (club === undefined) {
    return (
      <TrainerShell user={user}>
        <NotTrainerOfClub />
      </TrainerShell>
    );
  }

  return (
    <TrainerShell
      user={user}
      sections={clubSections(club.id)}
      header={<ClubSwitcher current={club} clubs={result.clubs} />}
    >
      {children}
    </TrainerShell>
  );
}
