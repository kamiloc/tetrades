import { redirect } from 'next/navigation';

import { PageBody, PageHeader } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { getServerLocalization } from '../../../../lib/server-i18n';
import { trainerHomeFor } from '../../../../lib/trainer/landing';
import { loadMyTrainerClubs } from '../../../../lib/trainer/my-clubs';
import { LoadFailed } from '../_components/load-failed';
import { NoClub } from '../_components/no-club';

export const dynamic = 'force-dynamic';

// /trainer: the only club's roster, the picker for several, or a message.
export default async function TrainerHomePage() {
  const [result, { t }] = await Promise.all([loadMyTrainerClubs(), getServerLocalization()]);
  if (result.status === 'signed-out') redirect('/login');
  if (result.status === 'ok') {
    const home = trainerHomeFor(result.clubs.map((club) => club.id));
    if (home.kind === 'redirect') redirect(home.to);
  }

  return (
    <>
      <TopBar crumbs={[{ label: t('portal.trainer') }]} />
      <PageBody>
        <PageHeader title={t('trainer.yourClubs')} />
        {result.status === 'ok' ? <NoClub /> : <LoadFailed />}
      </PageBody>
    </>
  );
}
