import { redirect } from 'next/navigation';

import { PageBody, PageHeader } from '../../../../components/layout';
import { TopBar } from '../../../../components/portal-shell';
import { trainerHomeFor } from '../../../../lib/trainer/landing';
import { loadMyTrainerClubs } from '../../../../lib/trainer/my-clubs';
import { LoadFailed } from '../_components/load-failed';
import { NoClub } from '../_components/no-club';

export const dynamic = 'force-dynamic';

// /trainer: the only club's roster, the picker for several, or a message.
export default async function TrainerHomePage() {
  const result = await loadMyTrainerClubs();
  if (result.status === 'signed-out') redirect('/login');
  if (result.status === 'ok') {
    const home = trainerHomeFor(result.clubs.map((club) => club.id));
    if (home.kind === 'redirect') redirect(home.to);
  }

  return (
    <>
      <TopBar crumbs={[{ label: 'Trainer portal' }]} />
      <PageBody>
        <PageHeader title="Your clubs" />
        {result.status === 'ok' ? <NoClub /> : <LoadFailed />}
      </PageBody>
    </>
  );
}
