import { getAppOrigin } from '../../../../../../lib/app-origin';

import { TrainersView } from './trainers-view';

export default async function ClubTrainersPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  // Passed down so the client bundle never reads WEB_URL (design D7).
  return <TrainersView clubId={clubId} appOrigin={getAppOrigin()} />;
}
