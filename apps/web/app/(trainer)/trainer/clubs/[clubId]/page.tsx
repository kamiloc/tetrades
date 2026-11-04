import { redirect } from 'next/navigation';

import { clubRosterPath } from '../../../../../lib/trainer/landing';

export default async function TrainerClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  redirect(clubRosterPath(clubId));
}
